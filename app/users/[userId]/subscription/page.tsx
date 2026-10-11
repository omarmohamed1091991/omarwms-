import Link from "next/link"
import { AlertTriangle, CalendarClock, CheckCircle2, CreditCard, Receipt, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { PlanCard } from "@/components/billing/plan-card"
import { SubscriptionActions } from "@/components/billing/subscription-actions"
import { getSessionUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  INTERVALS,
  LIVE_STATUSES,
  SUBSCRIPTION_STATUS,
  formatMoney,
  getUserPayments,
  getUserSubscription,
  listPlans,
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
  const live = sub && LIVE_STATUSES.includes(sub.status)
  const status = sub ? SUBSCRIPTION_STATUS[sub.status] ?? { label: sub.status, className: "" } : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">الاشتراك والفواتير</h1>
        <p className="text-sm text-slate-600 mt-1">إدارة خطتك والتجديد التلقائي وسجل المدفوعات</p>
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

      <Card className="p-6 rounded-2xl">
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
                    {live && !sub.cancelAtPeriodEnd ? "يتجدد تلقائياً في" : "ينتهي في"}{" "}
                    {sub.currentPeriodEnd.toLocaleDateString("ar-EG")}
                  </span>
                )}
                {live && (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4" />
                    التجديد التلقائي: {sub.cancelAtPeriodEnd ? "متوقف" : "مفعل"}
                  </span>
                )}
              </div>
              {sub.status === "past_due" && (
                <p className="text-sm text-amber-700">تعذر تحصيل دفعة التجديد. يرجى تحديث وسيلة الدفع لتجنب إيقاف الحساب.</p>
              )}
            </div>
            {live && (isOwner || viewer?.role === "admin") && (
              <SubscriptionActions userId={userId} cancelAtPeriodEnd={sub.cancelAtPeriodEnd} canOpenPortal={isOwner && !!sub.stripeCustomerId} />
            )}
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
                isCurrent={!!live && sub?.planId === plan.id}
                ctaLabel={live ? "الانتقال لهذه الخطة" : sub?.planId === plan.id ? "تجديد الاشتراك" : "اشترك الآن"}
                readOnly={!isOwner}
              />
            ))}
          </div>
        </div>
      )}

      <Card className="p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-bold text-slate-800">سجل المدفوعات</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد مدفوعات بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 border-b">
                <tr>
                  <th className="text-right py-2 font-medium">التاريخ</th>
                  <th className="text-right py-2 font-medium">الخطة</th>
                  <th className="text-right py-2 font-medium">المبلغ</th>
                  <th className="text-right py-2 font-medium">الفاتورة</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-3">{p.paidAt.toLocaleDateString("ar-EG")}</td>
                    <td className="py-3">{p.planName}</td>
                    <td className="py-3 font-medium">{formatMoney(p.amountCents, p.currency)}</td>
                    <td className="py-3">
                      {p.invoiceUrl ? (
                        <Link href={p.invoiceUrl} target="_blank" className="text-emerald-700 underline">
                          عرض
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
