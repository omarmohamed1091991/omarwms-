import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check, LogIn, UserPlus, AlertTriangle } from "lucide-react"
import { PageShell } from "@/components/marketing/legal-page"
import { CheckoutForm } from "@/components/billing/checkout-form"
import { getSessionUser } from "@/lib/auth"
import { isPaymobConfigured } from "@/lib/paymob"
import { CURRENCIES, INTERVALS, isSubscriptionLive, formatMoney, getPlan, getUserSubscription, type Interval } from "@/lib/billing"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "إتمام الاشتراك | o-wms" }

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>
  searchParams: Promise<{ cancelled?: string }>
}) {
  const { planId } = await params
  const { cancelled } = await searchParams
  const plan = await getPlan(Number(planId))
  if (!plan || !plan.isActive) notFound()

  const user = await getSessionUser()
  const current = user ? await getUserSubscription(user.id).catch(() => null) : null
  const hasLive = isSubscriptionLive(current)
  const currentIsPaymob = current?.provider === "paymob"
  const interval = INTERVALS[plan.interval as Interval] ?? INTERVALS.month
  const next = encodeURIComponent(`/checkout/${plan.id}`)

  return (
    <PageShell>
      <div className="container mx-auto px-6 max-w-5xl py-12">
        <nav className="text-xs text-gray-500 mb-4">
          <Link href="/#pricing" className="hover:text-emerald-700">
            الباقات
          </Link>{" "}
          / إتمام الاشتراك
        </nav>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">إتمام الاشتراك</h1>

        {cancelled && (
          <p className="mb-6 text-sm bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-4">
            تم إلغاء عملية الدفع ولم يتم خصم أي مبلغ. يمكنك المحاولة مرة أخرى.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <aside className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit">
            <p className="text-xs text-gray-500 mb-1">الخطة المختارة</p>
            <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
            {plan.nameEn && (
              <p className="text-xs text-gray-400" dir="ltr">
                {plan.nameEn}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-3">{plan.description}</p>
            <div className="my-5 border-y border-gray-100 py-4 space-y-1">
              <p className="text-2xl font-extrabold text-gray-900">
                {formatMoney(plan.priceEgpCents, "egp")}{" "}
                <span className="text-sm font-normal text-gray-500">{interval.label}</span>
              </p>
              <p className="text-sm text-emerald-700">≈ {formatMoney(plan.priceSarCents, "sar")}</p>
            </div>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/#pricing" className="block text-center text-xs text-emerald-700 underline mt-6">
              تغيير الخطة
            </Link>
          </aside>

          <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {!user ? (
              <div className="text-center py-10">
                <h2 className="text-lg font-bold text-gray-900 mb-2">سجّل الدخول لإتمام الدفع</h2>
                <p className="text-sm text-gray-600 mb-6">يرتبط الاشتراك بحسابك ليتم تفعيله تلقائياً بعد الدفع.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href={`/auth/login?next=${next}`}
                    className="flex items-center gap-2 h-11 px-6 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm"
                  >
                    <LogIn className="w-4 h-4" /> تسجيل الدخول
                  </Link>
                  <Link
                    href={`/auth/signup?next=${next}`}
                    className="flex items-center gap-2 h-11 px-6 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm"
                  >
                    <UserPlus className="w-4 h-4" /> إنشاء حساب جديد
                  </Link>
                </div>
              </div>
            ) : current?.planId === plan.id && hasLive ? (
              <div className="text-center py-10">
                <h2 className="text-lg font-bold text-gray-900 mb-2">أنت مشترك بالفعل في هذه الخطة</h2>
                <Link href={`/users/${user.id}/subscription`} className="text-sm text-emerald-700 underline">
                  إدارة الاشتراك
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-1">بيانات الدفع</h2>
                <p className="text-sm text-gray-500 mb-5">
                  الحساب: <span dir="ltr">{user.email}</span>
                </p>
                {hasLive && (
                  <p className="mb-5 flex items-start gap-2 text-sm bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    لديك اشتراك فعال في «{current!.planName}». سيتم إلغاؤه واستبداله بهذه الخطة فور إتمام الدفع.
                  </p>
                )}
                <CheckoutForm
                  planId={plan.id}
                  period={interval.label}
                  options={(["egp", "sar"] as const).map((code) => ({
                    code,
                    label: `${CURRENCIES[code].label} (${CURRENCIES[code].short})`,
                    amount: formatMoney(code === "egp" ? plan.priceEgpCents : plan.priceSarCents, code),
                    paymob: isPaymobConfigured(code),
                  }))}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  )
}
