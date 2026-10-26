import Link from "next/link"
import { AlertTriangle, CalendarClock, CheckCircle2, CreditCard, Download, Eye, Receipt, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { PlanCard } from "@/components/billing/plan-card"
import { getSessionUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  INTERVALS,
  isSubscriptionLive,
  SUBSCRIPTION_STATUS,
  formatMoney,
  getUserPayments,
  getUserSubscription,
  invoiceNumber,
  listPlans,
  orderNumber,
  type Interval,
} from "@/lib/billing"

export const dynamic = "force-dynamic"

export default async function SubscriptionPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const [viewer, sub, history, plans, { data: profile }] = await Promise.all([
    getSessionUser(),
    getUserSubscription(userId).catch(() => null),
    getUserPayments(userId).catch(() => []),
    listPlans({ activeOnly: true }),
    createAdminClient()
      .from("user_profiles")
      .select("account_status, account_active_until")
      .eq("id", userId)
      .single(),
  ])
  const isOwner = viewer?.id === userId
  const isAdmin = viewer?.role === "admin"
  const activeUntil = profile?.account_active_until ? new Date(profile.account_active_until) : null
  const accountActive = profile?.account_status === "active" && (!activeUntil || activeUntil > new Date())
  const live = isSubscriptionLive(sub)
  const isPaymob = sub?.provider === "paymob"
  const statusKey = sub && isPaymob && !live ? "incomplete_expired" : sub?.status
  const status = sub && statusKey ? SUBSCRIPTION_STATUS[statusKey] ?? { label: statusKey, className: "" } : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">الاشتراك والفواتير</h1>
        <p className="text-sm text-slate-600 mt-1">إدارة خطتك وتجديد الاشتراك وتحميل فواتير المدفوعات</p>
      </div>

      {accountActive ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            <span className="font-bold">حالة الحساب: نشط</span>
            {activeUntil && <> — حتى {activeUntil.toLocaleDateString("ar-EG")}</>}
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">حالة الحساب: غير نشط</p>
            <p className="mt-0.5">
              {isOwner
                ? "اختر إحدى الخطط أدناه وأتمّ الدفع لتجديد اشتراكك، وسيتم تفعيل حسابك تلقائياً فور نجاح الدفع."
                : "لم يقم المستخدم بالاشتراك أو تجديد اشتراكه بعد. سيتم تفعيل الحساب تلقائياً فور الدفع."}
            </p>
          </div>
        </div>
      )}

      <Card className="p-6 rounded-2xl border-slate-200 shadow-sm">
        {sub ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">الخطة الحالية</p>
                  <p className="text-lg font-bold text-gray-900">{sub.planName}</p>
                </div>
                {status && <span className={`text-xs px-2.5 py-1 rounded-full border ${status.className}`}>{status.label}</span>}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                <span>
                  {formatMoney(sub.amountCents, sub.currency)} {INTERVALS[sub.interval as Interval]?.label}
                </span>
                {sub.currentPeriodEnd && (
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4" />
                    ينتهي في{" "}
                    {sub.currentPeriodEnd.toLocaleDateString("ar-EG")}
                  </span>
                )}
                {live && (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4" />
                    التجديد يدوي – دفعة لكل فترة
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-700 font-medium mb-1">لا يوجد اشتراك فعال</p>
            <p className="text-sm text-gray-500">اختر إحدى الخطط أدناه للاشتراك والدفع إلكترونياً.</p>
          </div>
        )}
      </Card>

      {(isOwner || isAdmin) && plans.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            {!isOwner ? "خطط الأسعار المتاحة" : live ? "تغيير الخطة" : "اختر خطة لتجديد اشتراكك"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pt-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={!!live && !isPaymob && sub?.planId === plan.id}
                ctaLabel={
                  sub?.planId === plan.id && (!live || isPaymob)
                    ? live
                      ? "تجديد مبكر"
                      : "تجديد الاشتراك"
                    : live
                      ? "الانتقال لهذه الخطة"
                      : "اشترك الآن"
                }
                readOnly={!isOwner}
              />
            ))}
          </div>
        </div>
      )}

      <Card className="p-6 rounded-2xl border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-bold text-slate-800">سجل المدفوعات</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد مدفوعات بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 bg-slate-50">
                <tr>
                  <th className="text-right py-2.5 px-3 font-medium rounded-r-lg">رقم الفاتورة</th>
                  <th className="text-right py-2.5 px-3 font-medium">رقم الطلب</th>
                  <th className="text-right py-2.5 px-3 font-medium">التاريخ</th>
                  <th className="text-right py-2.5 px-3 font-medium">الخطة</th>
                  <th className="text-right py-2.5 px-3 font-medium">المبلغ</th>
                  <th className="text-right py-2.5 px-3 font-medium">وسيلة الدفع</th>
                  <th className="text-right py-2.5 px-3 font-medium rounded-l-lg">الفاتورة</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => {
                  const invoiceHref = `/users/${userId}/subscription/invoices/${p.id}`
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-mono text-xs text-slate-700" dir="ltr">
                        {invoiceNumber(p)}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-700" dir="ltr">
                        {orderNumber(p)}
                      </td>
                      <td className="py-3 px-3">{p.paidAt.toLocaleDateString("ar-EG")}</td>
                      <td className="py-3 px-3">{p.planName}</td>
                      <td className="py-3 px-3 font-semibold">{formatMoney(p.amountCents, p.currency)}</td>
                      <td className="py-3 px-3">{p.provider === "paymob" ? "Paymob" : "Stripe"}</td>
                      <td className="py-3 px-3">
                        {p.status === "paid" ? (
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={invoiceHref}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              عرض
                            </Link>
                            <Link
                              href={`${invoiceHref}?download=1`}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs text-white hover:bg-emerald-700"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </Link>
                          </div>
                        ) : p.invoiceUrl ? (
                          <Link href={p.invoiceUrl} target="_blank" className="text-emerald-700 underline">
                            عرض
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
