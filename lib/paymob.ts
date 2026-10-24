import crypto from "node:crypto"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { payments, paymobSessions, subscriptions, type PaymobSession, type PricingPlan } from "@/db/schema"
import { createAdminClient } from "@/lib/supabase/admin"
import { planPrice, type Currency } from "@/lib/billing"

// لكل عملة حساب Paymob مستقل: مصر (EGP) والسعودية (SAR).
const REGIONS = {
  egp: { base: "https://accept.paymob.com", currency: "EGP", country: "EG", env: "PAYMOB_EGP" },
  sar: { base: "https://ksa.paymob.com", currency: "SAR", country: "SA", env: "PAYMOB_SAR" },
} as const

function regionConfig(currency: Currency) {
  const region = REGIONS[currency]
  // لحساب مصر نقبل أيضاً الأسماء العامة (PAYMOB_API_KEY, PAYMOB_PUBLIC_KEY, ...) كما في أمثلة Paymob.
  const env = (name: string, ...fallbacks: string[]) =>
    process.env[`${region.env}_${name}`]?.trim() ||
    (currency === "egp" ? fallbacks.map((f) => process.env[f]?.trim()).find(Boolean) : undefined)
  // المفتاح السري والعام لواجهة Intention (Unified Checkout).
  const secretKey = env("SECRET_KEY", "PAYMOB_SECRET_KEY")
  const publicKey = env("PUBLIC_KEY", "PAYMOB_PUBLIC_KEY")
  // API Key القديم لواجهة الدفع عبر iframe، ويُستخدم عندما لا تكون Intention مفعّلة على الحساب.
  const apiKey = env("API_KEY", "PAYMOB_API_KEY")
  const iframeId = Number(env("IFRAME_ID", "PAYMOB_IFRAME_ID")) || null
  const hmacSecret = env("HMAC_SECRET", "PAYMOB_HMAC_SECRET", "PAYMOB_HMAC")
  const integrationIds = (env("INTEGRATION_IDS", "PAYMOB_INTEGRATION_IDS", "PAYMOB_INTEGRATION_ID") || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
  const intention = !!secretKey && !!publicKey
  if ((!intention && !apiKey) || !hmacSecret || integrationIds.length === 0) {
    const missing = [
      !intention && !apiKey && "SECRET_KEY + PUBLIC_KEY (or API_KEY)",
      !hmacSecret && "HMAC_SECRET",
      integrationIds.length === 0 && "INTEGRATION_IDS",
    ].filter(Boolean)
    console.warn(`[paymob] ${region.currency} not configured, missing: ${missing.map((m) => `${region.env}_${m}`).join(", ")}`)
    return null
  }
  return { ...region, secretKey, publicKey, apiKey, iframeId, intention, hmacSecret, integrationIds }
}

type RegionConfig = NonNullable<ReturnType<typeof regionConfig>>

type CheckoutInput = {
  reference: string
  amountCents: number
  item: { name: string; description: string }
  billing: Record<string, string>
  customer: { first_name: string; last_name: string; email: string }
  origin: string
  extras: Record<string, unknown>
}

/** واجهة Intention الحديثة: تعيد رابط صفحة الدفع الموحدة (Unified Checkout). */
async function intentionCheckout(config: RegionConfig, input: CheckoutInput) {
  const res = await fetch(`${config.base}/v1/intention/`, {
    method: "POST",
    headers: { Authorization: `Token ${config.secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amountCents,
      currency: config.currency,
      payment_methods: config.integrationIds,
      items: [{ ...input.item, amount: input.amountCents, quantity: 1 }],
      billing_data: input.billing,
      customer: input.customer,
      special_reference: input.reference,
      expiration: 3600,
      notification_url: `${input.origin}/api/paymob/webhook`,
      redirection_url: `${input.origin}/checkout/paymob/return`,
      extras: input.extras,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.client_secret) throw new Error(`Intention failed: ${res.status} ${data?.detail || data?.message || ""}`)
  return {
    intentionId: data.id ? String(data.id) : null,
    orderId: data.intention_order_id ? String(data.intention_order_id) : null,
    url: `${config.base}/unifiedcheckout/?publicKey=${encodeURIComponent(config.publicKey!)}&clientSecret=${encodeURIComponent(data.client_secret)}`,
  }
}

async function legacyPost(config: RegionConfig, path: string, body: object, token?: string) {
  const res = await fetch(`${config.base}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${data?.detail || data?.message || ""}`)
  return data
}

/**
 * واجهة الدفع القديمة (Order + Payment Key + iframe). تعتمد على روابط الـ callback
 * المضبوطة داخل الـ Integration في لوحة Paymob.
 */
async function legacyCheckout(config: RegionConfig, input: CheckoutInput) {
  const { token } = await legacyPost(config, "auth/tokens", { api_key: config.apiKey })
  const order = await legacyPost(config, "ecommerce/orders", {
    auth_token: token,
    delivery_needed: false,
    amount_cents: input.amountCents,
    currency: config.currency,
    merchant_order_id: input.reference,
    items: [{ ...input.item, amount_cents: input.amountCents, quantity: 1 }],
  })
  const key = await legacyPost(config, "acceptance/payment_keys", {
    auth_token: token,
    amount_cents: input.amountCents,
    expiration: 3600,
    order_id: order.id,
    currency: config.currency,
    integration_id: config.integrationIds[0],
    lock_order_when_paid: true,
    billing_data: { ...input.billing, shipping_method: "NA", postal_code: "NA" },
  })

  let iframeId = config.iframeId
  if (!iframeId) {
    // إذا لم يُحدَّد رقم الـ iframe نستخدم أول iframe في الحساب.
    const res = await fetch(`${config.base}/api/acceptance/iframes?page_size=50`, { headers: { Authorization: `Bearer ${token}` } })
    const list = (await res.json().catch(() => ({})))?.results ?? []
    iframeId = list[0]?.id ?? null
  }
  if (!iframeId) throw new Error("No Paymob iframe found – create one under Developers → iframes")

  return {
    intentionId: null,
    orderId: String(order.id),
    url: `${config.base}/api/acceptance/iframes/${iframeId}?payment_token=${encodeURIComponent(key.token)}`,
  }
}

export function isPaymobConfigured(currency: Currency) {
  return regionConfig(currency) !== null
}

function splitName(fullName: string | null | undefined) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean)
  return { first: parts[0] || "Customer", last: parts.slice(1).join(" ") || parts[0] || "OWMS" }
}

/** ينشئ Payment Intention لدى Paymob ويعيد رابط صفحة الدفع الموحدة (Unified Checkout). */
export async function createPaymobCheckout({
  user,
  plan,
  currency,
  origin,
}: {
  user: { id: string; email: string | null }
  plan: PricingPlan
  currency: Currency
  origin: string
}) {
  const config = regionConfig(currency)
  if (!config) throw new Error(`Paymob (${currency}) is not configured`)

  const { data: profile } = await createAdminClient()
    .from("user_profiles")
    .select("full_name, phone_number, email")
    .eq("id", user.id)
    .single()
  const email = profile?.email || user.email
  const phone = profile?.phone_number?.replace(/[\s-]/g, "")
  if (!email || !phone) throw new Error("MISSING_CONTACT")
  const name = splitName(profile?.full_name)

  const amountCents = planPrice(plan, currency)
  const reference = `owms-${user.id.slice(0, 8)}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`
  const [session] = await db
    .insert(paymobSessions)
    .values({
      reference,
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      currency,
      amountCents,
      interval: plan.interval,
    })
    .returning()

  const input: CheckoutInput = {
    reference,
    amountCents,
    item: {
      name: `o-wms – ${plan.nameEn || plan.name}`.slice(0, 50),
      description: `${plan.name} – ${plan.interval === "year" ? "اشتراك سنة واحدة" : "اشتراك شهر واحد"}`.slice(0, 255),
    },
    billing: {
      first_name: name.first,
      last_name: name.last,
      email,
      phone_number: phone,
      apartment: "NA",
      floor: "NA",
      street: "NA",
      building: "NA",
      city: "NA",
      state: "NA",
      country: config.country,
    },
    customer: { first_name: name.first, last_name: name.last, email },
    origin,
    extras: { userId: user.id, planId: plan.id },
  }

  let result: Awaited<ReturnType<typeof intentionCheckout>> | null = null
  if (config.intention) {
    try {
      result = await intentionCheckout(config, input)
    } catch (error) {
      console.error("[paymob]", error instanceof Error ? error.message : error)
    }
  }
  if (!result && config.apiKey) {
    try {
      result = await legacyCheckout(config, input)
    } catch (error) {
      console.error("[paymob]", error instanceof Error ? error.message : error)
    }
  }
  if (!result) {
    await db.update(paymobSessions).set({ status: "failed", updatedAt: new Date() }).where(eq(paymobSessions.id, session.id))
    throw new Error("Paymob checkout failed")
  }

  await db
    .update(paymobSessions)
    .set({ intentionId: result.intentionId, paymobOrderId: result.orderId, updatedAt: new Date() })
    .where(eq(paymobSessions.id, session.id))

  return { url: result.url, reference }
}

// ترتيب الحقول الذي تعتمده Paymob لحساب HMAC لبيانات المعاملة.
const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const

/** بيانات المعاملة بشكل موحد سواء وصلت من webhook (JSON) أو من رابط العودة (query string). */
export type PaymobTransaction = Record<(typeof HMAC_FIELDS)[number], string> & { merchant_order_id: string }

export function transactionFromWebhook(obj: any): PaymobTransaction {
  const get = (path: string) => path.split(".").reduce((v, k) => (v == null ? v : v[k]), obj)
  const tx = Object.fromEntries(HMAC_FIELDS.map((f) => [f, String(get(f) ?? "")])) as PaymobTransaction
  tx.merchant_order_id = String(obj?.order?.merchant_order_id ?? obj?.special_reference ?? "")
  return tx
}

export function transactionFromQuery(params: Record<string, string | undefined>): PaymobTransaction {
  const tx = Object.fromEntries(
    HMAC_FIELDS.map((f) => [f, String((f === "order.id" ? params.order : params[f]) ?? "")]),
  ) as PaymobTransaction
  tx.merchant_order_id = String(params.merchant_order_id ?? "")
  return tx
}

function verifyHmac(tx: PaymobTransaction, hmac: string, secret: string) {
  const expected = crypto
    .createHmac("sha512", secret)
    .update(HMAC_FIELDS.map((f) => tx[f]).join(""))
    .digest("hex")
  const a = Buffer.from(expected)
  const b = Buffer.from(String(hmac).toLowerCase())
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function findSession(tx: PaymobTransaction) {
  if (tx.merchant_order_id) {
    const [byRef] = await db.select().from(paymobSessions).where(eq(paymobSessions.reference, tx.merchant_order_id))
    if (byRef) return byRef
  }
  if (tx["order.id"]) {
    const [byOrder] = await db.select().from(paymobSessions).where(eq(paymobSessions.paymobOrderId, tx["order.id"]))
    if (byOrder) return byOrder
  }
  return null
}

function addInterval(from: Date, interval: string) {
  const d = new Date(from)
  if (interval === "year") d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

/**
 * يتحقق من توقيع Paymob ثم يفعّل الاشتراك لفترة واحدة (شهر/سنة) عند نجاح الدفع.
 * العملية idempotent: تكرار نفس الإشعار لا يمدد الاشتراك مرتين.
 */
export async function processPaymobTransaction(tx: PaymobTransaction, hmac: string | null | undefined) {
  if (!hmac) return { ok: false as const, reason: "missing_hmac" }
  const session = await findSession(tx)
  if (!session) return { ok: false as const, reason: "unknown_session" }
  const config = regionConfig(session.currency as Currency)
  if (!config || !verifyHmac(tx, hmac, config.hmacSecret)) return { ok: false as const, reason: "invalid_hmac" }

  const success = tx.success === "true" && tx.pending !== "true" && tx.is_voided !== "true" && tx.is_refunded !== "true"
  const amountMatches = Number(tx.amount_cents) === session.amountCents && tx.currency.toLowerCase() === session.currency

  if (session.status === "paid") return { ok: true as const, session, paid: true }
  if (!success || !amountMatches) {
    if (tx.pending !== "true") {
      await db
        .update(paymobSessions)
        .set({ status: "failed", paymobTransactionId: tx.id || null, updatedAt: new Date() })
        .where(and(eq(paymobSessions.id, session.id), eq(paymobSessions.status, "pending")))
    }
    if (success && !amountMatches) console.error("[paymob] Amount mismatch for session", session.reference)
    return { ok: true as const, session, paid: false, pending: tx.pending === "true" }
  }

  // نقفل الجلسة أولاً حتى لا يُعالَج الدفع مرتين (webhook + رابط العودة في نفس الوقت).
  const [locked] = await db
    .update(paymobSessions)
    .set({ status: "paid", paymobTransactionId: tx.id, paymobOrderId: tx["order.id"] || session.paymobOrderId, updatedAt: new Date() })
    .where(and(eq(paymobSessions.id, session.id), eq(paymobSessions.status, "pending")))
    .returning()
  if (!locked) return { ok: true as const, session, paid: true }

  const subscription = await activatePaymobPeriod(locked)
  await db
    .insert(payments)
    .values({
      userId: locked.userId,
      subscriptionId: subscription.id,
      planName: locked.planName,
      amountCents: locked.amountCents,
      currency: locked.currency,
      status: "paid",
      provider: "paymob",
      paymobTransactionId: tx.id,
      paidAt: new Date(),
    })
    .onConflictDoNothing()

  return { ok: true as const, session: locked, paid: true, subscription }
}

async function activatePaymobPeriod(session: PaymobSession) {
  const now = new Date()
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, session.userId), eq(subscriptions.provider, "paymob")))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  // التجديد قبل انتهاء الفترة يُضاف إلى نهاية الفترة الحالية حتى لا يخسر المستخدم أي أيام.
  const start = existing?.currentPeriodEnd && existing.currentPeriodEnd > now ? existing.currentPeriodEnd : now
  const end = addInterval(start, session.interval)
  const values = {
    userId: session.userId,
    planId: session.planId,
    planName: session.planName,
    currency: session.currency,
    amountCents: session.amountCents,
    interval: session.interval,
    status: "active",
    provider: "paymob",
    currentPeriodEnd: end,
    // دفعة لكل فترة: لا يوجد خصم تلقائي من Paymob.
    cancelAtPeriodEnd: true,
    updatedAt: now,
  }
  const [row] = existing
    ? await db.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id)).returning()
    : await db.insert(subscriptions).values(values).returning()

  await createAdminClient()
    .from("user_profiles")
    .update({
      subscription_expires_at: end.toISOString(),
      account_active_until: end.toISOString(),
      account_status: "active",
      is_active: true,
    })
    .eq("id", session.userId)

  return row
}
