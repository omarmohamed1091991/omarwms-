import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { PageShell } from "@/components/marketing/legal-page"
import { getSessionUser } from "@/lib/auth"
import { INTERVALS, formatMoney, type Interval } from "@/lib/billing"
import { processPaymobTransaction, transactionFromQuery } from "@/lib/paymob"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "نتيجة الدفع | o-wms" }

// رابط العودة من Paymob (Transaction response callback). يتحقق من HMAC ويفعّل الاشتراك فوراً
// دون انتظار الـ webhook. المعالجة idempotent فلا يتكرر التمديد.
export default async function PaymobReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const user = await getSessionUser()
  const result = await processPaymobTransaction(transactionFromQuery(params), params.hmac).catch((error) => {
    console.error("[paymob return] failed:", error)
    return null
  })

  const valid = result?.ok === true
  const paid = valid && result.paid
  const pending = valid && !result.paid && "pending" in result && result.pending
  const session = valid ? result.session : null
  const end = valid && "subscription" in result ? result.subscription?.currentPeriodEnd : null
  const owner = user && session && session.userId === user.id

  return (
    <PageShell>
      <div className="container mx-auto px-6 max-w-xl py-16">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          {paid ? (
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
          ) : pending ? (
            <Clock className="w-14 h-14 text-amber-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {paid ? "تم الدفع وتفعيل اشتراكك بنجاح" : pending ? "عملية الدفع قيد المراجعة" : "لم تتم عملية الدفع"}
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            {paid
              ? "شكراً لك! تم تفعيل حسابك. هذا الاشتراك دفعة واحدة للفترة المختارة ولن يتم خصم أي مبالغ تلقائياً، ويمكنك التجديد من صفحة الاشتراك قبل انتهاء الفترة."
              : pending
                ? "سيتم تفعيل اشتراكك تلقائياً فور تأكيد الدفع من Paymob."
                : "لم يتم خصم أي مبلغ. يمكنك المحاولة مرة أخرى أو اختيار وسيلة دفع مختلفة."}
          </p>
          {session && owner && (
            <dl className="text-sm text-right bg-gray-50 rounded-xl p-4 space-y-2 mb-6">
              <div className="flex justify-between">
                <dt className="text-gray-500">الخطة</dt>
                <dd className="font-semibold">{session.planName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">المبلغ</dt>
                <dd className="font-semibold">
                  {formatMoney(session.amountCents, session.currency)} – {INTERVALS[session.interval as Interval]?.noun ?? "شهر"} واحد
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">رقم المرجع</dt>
                <dd className="font-mono text-xs" dir="ltr">
                  {session.reference}
                </dd>
              </div>
              {end && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">الاشتراك فعال حتى</dt>
                  <dd className="font-semibold">{end.toLocaleDateString("ar-EG")}</dd>
                </div>
              )}
            </dl>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {!paid && session?.planId && (
              <Link
                href={`/checkout/${session.planId}`}
                className="inline-block h-11 px-6 leading-[2.75rem] rounded-lg border border-emerald-200 text-emerald-700 text-sm"
              >
                إعادة المحاولة
              </Link>
            )}
            <Link
              href={user ? `/users/${user.id}/subscription` : "/auth/login"}
              className="inline-block h-11 px-6 leading-[2.75rem] rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm"
            >
              الذهاب إلى إدارة الاشتراك
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
