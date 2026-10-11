import type Stripe from "stripe"
import { and, asc, desc, eq, gt, inArray, isNull, ne, or } from "drizzle-orm"
import { db } from "@/db"
import { payments, pricingPlans, subscriptions, type PricingPlan, type Subscription } from "@/db/schema"
import { createAdminClient } from "@/lib/supabase/admin"

export const CURRENCIES = {
  egp: { code: "egp", label: "جنيه مصري", symbol: "ج.م", short: "EGP" },
  sar: { code: "sar", label: "ريال سعودي", symbol: "ر.س", short: "SAR" },
} as const
export type Currency = keyof typeof CURRENCIES

export const INTERVALS = {
  month: { label: "شهرياً", noun: "شهر" },
  year: { label: "سنوياً", noun: "سنة" },
} as const
export type Interval = keyof typeof INTERVALS

export const SUBSCRIPTION_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "نشط", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  trialing: { label: "فترة تجريبية", className: "bg-blue-50 text-blue-700 border-blue-200" },
  past_due: { label: "متأخر السداد", className: "bg-amber-50 text-amber-700 border-amber-200" },
  unpaid: { label: "غير مدفوع", className: "bg-red-50 text-red-700 border-red-200" },
  incomplete: { label: "بانتظار الدفع", className: "bg-gray-50 text-gray-700 border-gray-200" },
  incomplete_expired: { label: "منتهي", className: "bg-gray-50 text-gray-500 border-gray-200" },
  canceled: { label: "ملغي", className: "bg-gray-50 text-gray-500 border-gray-200" },
}

export const LIVE_STATUSES = ["active", "trialing", "past_due"]
export const ENDED_STATUSES = ["canceled", "unpaid", "incomplete_expired"]

/** اشتراكات Paymob (دفعة لكل فترة) تبقى "active" في السجل، لذلك نعتبرها منتهية بعد تاريخ نهاية الفترة. */
export function isSubscriptionLive(sub: Pick<Subscription, "status" | "provider" | "currentPeriodEnd"> | null | undefined) {
  if (!sub || !LIVE_STATUSES.includes(sub.status)) return false
  if (sub.provider === "paymob") return !!sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()
  return true
}

export function formatMoney(cents: number, currency: string) {
  const c = CURRENCIES[currency as Currency]
  const amount = (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })
  return c ? `${amount} ${c.symbol}` : `${amount} ${currency.toUpperCase()}`
}

export function planPrice(plan: PricingPlan, currency: Currency) {
  return currency === "egp" ? plan.priceEgpCents : plan.priceSarCents
}

export async function listPlans({ activeOnly = false } = {}) {
  try {
    const query = db.select().from(pricingPlans)
    const rows = activeOnly ? await query.where(eq(pricingPlans.isActive, true)).orderBy(asc(pricingPlans.sortOrder), asc(pricingPlans.id)) : await query.orderBy(asc(pricingPlans.sortOrder), asc(pricingPlans.id))
    return rows
  } catch (error) {
    console.error("[billing] Failed to load pricing plans:", error)
    return []
  }
}

export async function getPlan(id: number) {
  if (!Number.isInteger(id)) return null
  try {
    const [plan] = await db.select().from(pricingPlans).where(eq(pricingPlans.id, id))
    return plan ?? null
  } catch (error) {
    console.error("[billing] Failed to load plan:", error)
    return null
  }
}

export async function getUserSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)
  return sub ?? null
}

export async function getUserPayments(userId: string) {
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.paidAt)).limit(50)
}

export async function getSubscriptionsForUsers(userIds: string[]) {
  if (userIds.length === 0) return {}
  try {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(inArray(subscriptions.userId, userIds))
      .orderBy(desc(subscriptions.createdAt))
    const map: Record<string, (typeof rows)[number]> = {}
    for (const row of rows) if (!map[row.userId]) map[row.userId] = row
    return map
  } catch (error) {
    console.error("[billing] Failed to load subscriptions:", error)
    return {}
  }
}

function periodEnd(sub: Stripe.Subscription) {
  // في إصدارات Stripe الحديثة انتقل current_period_end إلى عناصر الاشتراك.
  const seconds = (sub.items?.data?.[0] as any)?.current_period_end ?? (sub as any).current_period_end
  return seconds ? new Date(seconds * 1000) : null
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const ref = (invoice as any).parent?.subscription_details?.subscription ?? (invoice as any).subscription
  if (!ref) return null
  return typeof ref === "string" ? ref : ref.id
}

/** يحدّث سجل الاشتراك من Stripe ويمدد صلاحية حساب المستخدم في Supabase. */
export async function syncStripeSubscription(stripeSub: Stripe.Subscription) {
  const userId = stripeSub.metadata?.userId
  if (!userId) return null
  const planId = Number(stripeSub.metadata?.planId) || null
  const item = stripeSub.items?.data?.[0]
  const end = periodEnd(stripeSub)
  const values = {
    userId,
    planId,
    planName: stripeSub.metadata?.planName || "اشتراك",
    currency: stripeSub.currency,
    amountCents: item?.price?.unit_amount ?? 0,
    interval: item?.price?.recurring?.interval ?? "month",
    status: stripeSub.status,
    stripeCustomerId: typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer?.id,
    stripeSubscriptionId: stripeSub.id,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end || stripeSub.cancel_at),
    updatedAt: new Date(),
  }

  const [row] = await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({ target: subscriptions.stripeSubscriptionId, set: values })
    .returning()

  if ((stripeSub.status === "active" || stripeSub.status === "trialing") && end) {
    await createAdminClient()
      .from("user_profiles")
      .update({
        subscription_expires_at: end.toISOString(),
        account_active_until: end.toISOString(),
        account_status: "active",
        is_active: true,
      })
      .eq("id", userId)
  } else if (ENDED_STATUSES.includes(stripeSub.status)) {
    // انتهى الاشتراك: يعود الحساب غير نشط ما لم يكن لدى المستخدم اشتراك آخر سارٍ.
    const [otherLive] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          or(ne(subscriptions.stripeSubscriptionId, stripeSub.id), isNull(subscriptions.stripeSubscriptionId)),
          inArray(subscriptions.status, LIVE_STATUSES),
          or(isNull(subscriptions.currentPeriodEnd), gt(subscriptions.currentPeriodEnd, new Date())),
        ),
      )
      .limit(1)
    if (!otherLive) {
      await createAdminClient()
        .from("user_profiles")
        .update({ account_status: "suspended", is_active: false })
        .eq("id", userId)
    }
  }

  return row
}

/** يلغي فوراً أي اشتراكات أخرى للمستخدم عند الانتقال إلى خطة جديدة. */
export async function cancelOtherSubscriptions(stripe: Stripe, userId: string, keepStripeId: string) {
  const others = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        ne(subscriptions.stripeSubscriptionId, keepStripeId),
        inArray(subscriptions.status, LIVE_STATUSES),
      ),
    )
  for (const other of others) {
    if (!other.stripeSubscriptionId) continue
    try {
      const canceled = await stripe.subscriptions.cancel(other.stripeSubscriptionId)
      await syncStripeSubscription(canceled)
    } catch (error) {
      console.error("[billing] Failed to cancel previous subscription:", error)
    }
  }
}

export async function recordInvoicePayment(invoice: Stripe.Invoice, sub: { id: number; userId: string; planName: string } | null) {
  const userId = sub?.userId || (invoice as any).parent?.subscription_details?.metadata?.userId
  if (!userId) return
  const values = {
    userId,
    subscriptionId: sub?.id ?? null,
    planName: sub?.planName || "اشتراك",
    amountCents: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status || "paid",
    stripeInvoiceId: invoice.id,
    invoiceUrl: invoice.hosted_invoice_url || null,
    paidAt: new Date(((invoice as any).status_transitions?.paid_at || invoice.created) * 1000),
  }
  await db.insert(payments).values(values).onConflictDoUpdate({ target: payments.stripeInvoiceId, set: values })
}

export function siteOrigin(request?: Request) {
  if (request) return new URL(request.url).origin
  const configured = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  return (configured || "http://localhost:3000").replace(/\/$/, "")
}
