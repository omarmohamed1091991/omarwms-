import { desc, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { payments, paymobSessions, subscriptions, type PricingPlan, type Subscription } from "@/db/schema"
import { selectPlan, selectPlans } from "@/lib/catalog"
import { SAR_ENABLED } from "@/lib/currency-flags"

export { SAR_ENABLED }

export const CURRENCIES = {
  egp: { code: "egp", label: "جنيه مصري", symbol: "ج.م", short: "EGP" },
  sar: { code: "sar", label: "ريال سعودي", symbol: "ر.س", short: "SAR" },
} as const
export type Currency = keyof typeof CURRENCIES

/** العملات المتاحة حالياً للعرض والدفع. */
export const ENABLED_CURRENCIES: Currency[] = SAR_ENABLED ? ["egp", "sar"] : ["egp"]

export function isCurrencyEnabled(currency: Currency) {
  return (ENABLED_CURRENCIES as string[]).includes(currency)
}

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

// خطط الأسعار تُقرأ من Supabase.
export async function listPlans({ activeOnly = false } = {}) {
  try {
    return await selectPlans(activeOnly)
  } catch (error) {
    console.error("[billing] Failed to load pricing plans:", error)
    return []
  }
}

export async function getPlan(id: number) {
  if (!Number.isInteger(id)) return null
  try {
    return await selectPlan(id)
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

const paymentWithOrder = {
  payment: payments,
  orderId: paymobSessions.paymobOrderId,
  reference: paymobSessions.reference,
  interval: paymobSessions.interval,
}

export async function getUserPayments(userId: string) {
  const rows = await db
    .select(paymentWithOrder)
    .from(payments)
    .leftJoin(paymobSessions, eq(paymobSessions.paymobTransactionId, payments.paymobTransactionId))
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.paidAt))
    .limit(50)
  return rows.map((r) => ({ ...r.payment, orderId: r.orderId, reference: r.reference, interval: r.interval }))
}

/** جميع الفواتير (المدفوعات) لكل العملاء — للأدمن فقط. */
export async function getAllPayments(limit = 1000) {
  try {
    const rows = await db
      .select({
        ...paymentWithOrder,
        discountCode: paymobSessions.discountCode,
        discountPercent: paymobSessions.discountPercent,
        originalAmountCents: paymobSessions.originalAmountCents,
      })
      .from(payments)
      .leftJoin(paymobSessions, eq(paymobSessions.paymobTransactionId, payments.paymobTransactionId))
      .orderBy(desc(payments.paidAt))
      .limit(limit)
    return rows.map((r) => ({
      ...r.payment,
      orderId: r.orderId,
      reference: r.reference,
      interval: r.interval,
      discountCode: r.discountCode,
      discountPercent: r.discountPercent,
      originalAmountCents: r.originalAmountCents,
    }))
  } catch (error) {
    console.error("[billing] Failed to load payments:", error)
    return []
  }
}

export async function getPaymentWithOrder(paymentId: number) {
  if (!Number.isInteger(paymentId)) return null
  const [row] = await db
    .select(paymentWithOrder)
    .from(payments)
    .leftJoin(paymobSessions, eq(paymobSessions.paymobTransactionId, payments.paymobTransactionId))
    .where(eq(payments.id, paymentId))
    .limit(1)
  return row ? { ...row.payment, orderId: row.orderId, reference: row.reference, interval: row.interval } : null
}

export async function getPaymentIdByTransaction(transactionId: string | null | undefined) {
  if (!transactionId) return null
  const [row] = await db.select({ id: payments.id }).from(payments).where(eq(payments.paymobTransactionId, transactionId)).limit(1)
  return row?.id ?? null
}

/** رقم فاتورة ثابت مبني على تاريخ ومعرّف الدفعة، مثل INV-2026-000012. */
export function invoiceNumber(payment: { id: number; paidAt: Date }) {
  return `INV-${payment.paidAt.getFullYear()}-${String(payment.id).padStart(6, "0")}`
}

/** رقم الطلب: رقم طلب Paymob إن وُجد، وإلا رقم المرجع المرسل إلى Paymob. */
export function orderNumber(payment: { orderId?: string | null; reference?: string | null; paymobTransactionId?: string | null }) {
  return payment.orderId || payment.reference || payment.paymobTransactionId || "—"
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

export function siteOrigin(request?: Request) {
  if (request) return new URL(request.url).origin
  const configured = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  return (configured || "http://localhost:3000").replace(/\/$/, "")
}
