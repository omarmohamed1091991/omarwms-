import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, Clock } from "lucide-react"
import { PageShell } from "@/components/marketing/legal-page"
import { getSessionUser } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { INTERVALS, cancelOtherSubscriptions, formatMoney, syncStripeSubscription, type Interval } from "@/lib/billing"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "تم الدفع بنجاح | o-wms" }

async function confirm(sessionId: string, userId: string) {
  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] })
    if (session.client_reference_id !== userId || !session.subscription || typeof session.subscription === "string") {
      return null
    }
    // مزامنة فورية حتى لا ينتظر المستخدم وصول الـ webhook.
    const row = await syncStripeSubscription(session.subscription)
    if (session.payment_status === "paid") await cancelOtherSubscriptions(stripe, userId, session.subscription.id)
    return { row, paid: session.payment_status === "paid" }
  } catch (error) {
    console.error("[checkout success] confirm failed:", error)
    return null
  }
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams
  const user = await getSessionUser()
  const result = user && session_id ? await confirm(session_id, user.id) : null
  const row = result?.row

  return (
    <PageShell>
      <div className="container mx-auto px-6 max-w-xl py-16">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          {result?.paid ? (
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
          ) : (
            <Clock className="w-14 h-14 text-amber-500 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {result?.paid ? "تم الدفع وتفعيل اشتراكك بنجاح" : "جاري تأكيد عملية الدفع"}
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            {result?.paid
              ? "شكراً لك! تم إرسال الإيصال إلى بريدك الإلكتروني، وسيتجدد اشتراكك تلقائياً."
              : "سيتم تفعيل اشتراكك تلقائياً خلال دقائق فور تأكيد الدفع من البنك."}
          </p>
          {row && (
            <dl className="text-sm text-right bg-gray-50 rounded-xl p-4 space-y-2 mb-6">
              <div className="flex justify-between">
                <dt className="text-gray-500">الخطة</dt>
                <dd className="font-semibold">{row.planName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">المبلغ</dt>
                <dd className="font-semibold">
                  {formatMoney(row.amountCents, row.currency)} {INTERVALS[row.interval as Interval]?.label}
                </dd>
              </div>
              {row.currentPeriodEnd && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">التجديد القادم</dt>
                  <dd className="font-semibold">{row.currentPeriodEnd.toLocaleDateString("ar-EG")}</dd>
                </div>
              )}
            </dl>
          )}
          <Link
            href={user ? `/users/${user.id}/subscription` : "/auth/login"}
            className="inline-block h-11 px-6 leading-[2.75rem] rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm"
          >
            الذهاب إلى إدارة الاشتراك
          </Link>
        </div>
      </div>
    </PageShell>
  )
}
