import type { ReactNode } from "react"
import Link from "next/link"
import { Calendar, CheckCircle2, CreditCard, Percent, Receipt, TicketPercent, TrendingUp, UserPlus, Users, Wallet } from "lucide-react"
import { getAllUsers } from "@/lib/supabase/server"
import { getSessionUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { UsersList } from "@/components/users/users-list"
import { PlansManager } from "@/components/billing/plans-manager"
import { DiscountsManager } from "@/components/billing/discounts-manager"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { InvoicesTable, type AdminInvoice } from "@/components/admin/invoices-table"
import { ADMIN_SECTIONS, parseSection } from "@/components/admin/sections"
import { listDiscountCodes } from "@/lib/discounts"
import {
  INTERVALS,
  formatMoney,
  getAllPayments,
  getSubscriptionsForUsers,
  invoiceNumber,
  isSubscriptionLive,
  listPlans,
  orderNumber,
  type Interval,
} from "@/lib/billing"

export const revalidate = 0

export default async function AdminControlCenter({ searchParams }: { searchParams: Promise<{ section?: string | string[] }> }) {
  const section = parseSection((await searchParams).section)

  const [viewer, users, plans, discounts, payments] = await Promise.all([
    getSessionUser(),
    getAllUsers(),
    listPlans(),
    listDiscountCodes(),
    getAllPayments(),
  ])
  const subscriptionsByUser = await getSubscriptionsForUsers((users || []).map((u) => u.id))
  const liveSubs = Object.values(subscriptionsByUser).filter((s) => isSubscriptionLive(s))

  const meta = ADMIN_SECTIONS.find((s) => s.key === section)!
  const counts = { users: users.length, plans: plans.length, discounts: discounts.length, invoices: payments.length }

  let content: ReactNode
  if (section === "plans") {
    const adminPlans = plans.map((p) => ({ ...p, subscribers: liveSubs.filter((s) => s.planId === p.id).length }))
    content = (
      <>
        <StatGrid>
          <Stat icon={CreditCard} tone="emerald" label="إجمالي الخطط" value={plans.length} />
          <Stat icon={CheckCircle2} tone="blue" label="الخطط النشطة" value={plans.filter((p) => p.isActive).length} />
          <Stat icon={Users} tone="violet" label="المشتركون الحاليون" value={liveSubs.length} />
        </StatGrid>
        <Panel>
          <PlansManager plans={adminPlans} />
        </Panel>
      </>
    )
  } else if (section === "discounts") {
    const adminDiscounts = discounts.map((d) => ({
      id: d.id,
      code: d.code,
      percentOff: d.percentOff,
      description: d.description,
      isActive: d.isActive,
      maxUses: d.maxUses,
      expiresAt: d.expiresAt?.toISOString() ?? null,
      uses: d.uses,
    }))
    content = (
      <>
        <StatGrid>
          <Stat icon={TicketPercent} tone="amber" label="إجمالي الأكواد" value={discounts.length} />
          <Stat icon={CheckCircle2} tone="emerald" label="الأكواد النشطة" value={discounts.filter((d) => d.isActive).length} />
          <Stat icon={Percent} tone="violet" label="مرات الاستخدام" value={discounts.reduce((n, d) => n + (d.uses || 0), 0)} />
        </StatGrid>
        <Panel>
          <DiscountsManager discounts={adminDiscounts} />
        </Panel>
      </>
    )
  } else if (section === "invoices") {
    const byId = new Map(users.map((u) => [u.id, u]))
    const invoices: AdminInvoice[] = payments.map((p) => {
      const u = byId.get(p.userId)
      return {
        id: p.id,
        number: invoiceNumber(p),
        order: orderNumber(p),
        userId: p.userId,
        customerName: u?.full_name || u?.phone_number || u?.email || "عميل محذوف",
        customerEmail: u?.email ?? null,
        customerPhone: u?.phone_number ?? null,
        planName: p.planName,
        intervalLabel: INTERVALS[(p.interval ?? "month") as Interval]?.label ?? "",
        amount: formatMoney(p.amountCents, p.currency),
        originalAmount: p.discountCode && p.originalAmountCents ? formatMoney(p.originalAmountCents, p.currency) : null,
        discountCode: p.discountCode ?? null,
        discountPercent: p.discountPercent ?? null,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        paidAt: p.paidAt.toISOString(),
      }
    })
    const paid = payments.filter((p) => p.status === "paid")
    const now = new Date()
    const thisMonth = paid.filter((p) => p.paidAt.getFullYear() === now.getFullYear() && p.paidAt.getMonth() === now.getMonth())
    const sumBy = (rows: typeof paid) => {
      const totals = new Map<string, number>()
      for (const r of rows) totals.set(r.currency, (totals.get(r.currency) ?? 0) + r.amountCents)
      return totals.size === 0 ? formatMoney(0, "egp") : [...totals].map(([c, v]) => formatMoney(v, c)).join(" + ")
    }
    content = (
      <>
        <StatGrid cols={4}>
          <Stat icon={Receipt} tone="blue" label="إجمالي الفواتير" value={payments.length} />
          <Stat icon={Wallet} tone="emerald" label="إجمالي الإيرادات" value={sumBy(paid)} />
          <Stat icon={TrendingUp} tone="violet" label="إيرادات هذا الشهر" value={sumBy(thisMonth)} />
          <Stat icon={Users} tone="amber" label="العملاء الدافعون" value={new Set(paid.map((p) => p.userId)).size} />
        </StatGrid>
        <Panel title="جميع الفواتير" subtitle="كل عمليات الدفع لجميع العملاء، الأحدث أولاً">
          <InvoicesTable invoices={invoices} />
        </Panel>
      </>
    )
  } else {
    const today = new Date().toDateString()
    const userPlans = Object.fromEntries(
      Object.entries(subscriptionsByUser).map(([id, s]) => [
        id,
        { planName: s.planName, status: s.status, currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: s.cancelAtPeriodEnd },
      ]),
    )
    content = (
      <>
        <StatGrid cols={4}>
          <Stat icon={Users} tone="emerald" label="إجمالي المستخدمين" value={users.length} />
          <Stat icon={CheckCircle2} tone="blue" label="المستخدمين النشطين" value={users.filter((u) => u.is_active).length} />
          <Stat icon={CreditCard} tone="violet" label="اشتراكات فعالة" value={liveSubs.length} />
          <Stat icon={Calendar} tone="amber" label="تمت الإضافة اليوم" value={users.filter((u) => new Date(u.created_at).toDateString() === today).length} />
        </StatGrid>
        <Panel
          title="قائمة المستخدمين"
          subtitle="إدارة جميع مستخدمي النظام"
          action={
            <Link href="/users/new">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 rounded-xl gap-1.5">
                <UserPlus className="w-4 h-4" />
                إضافة جديد
              </Button>
            </Link>
          }
        >
          {users.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-slate-700 font-medium mb-1">لا يوجد مستخدمين حالياً</p>
              <p className="text-slate-500 text-sm mb-5">ابدأ بإضافة أول مستخدم للنظام</p>
              <Link href="/users/new">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">إضافة أول مستخدم</Button>
              </Link>
            </div>
          ) : (
            <UsersList users={users} plans={userPlans} />
          )}
        </Panel>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <AdminSidebar
        active={section}
        counts={counts}
        adminName={viewer?.fullName || "مدير النظام"}
        adminEmail={viewer?.email ?? null}
        adminId={viewer?.id ?? null}
      />

      <main className="flex-1 min-w-0">
        <header className="hidden lg:flex sticky top-0 z-30 h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white/85 backdrop-blur px-8">
          <div>
            <p className="text-xs text-slate-500">مركز التحكم</p>
            <h1 className="text-xl font-bold text-slate-900">{meta.label}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/users/new">
              <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs gap-1.5 bg-white">
                <UserPlus className="w-4 h-4" />
                مستخدم جديد
              </Button>
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px]">
          <div className="lg:hidden">
            <h1 className="text-lg font-bold text-slate-900">{meta.label}</h1>
            <p className="text-xs text-slate-500">{meta.hint}</p>
          </div>
          {content}
        </div>
      </main>
    </div>
  )
}

const TONES = {
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
} as const

function StatGrid({ children, cols = 3 }: { children: ReactNode; cols?: 3 | 4 }) {
  return <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"} gap-4`}>{children}</div>
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: ReactNode; tone: keyof typeof TONES }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 shrink-0 rounded-xl ring-1 flex items-center justify-center ${TONES[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums truncate">{value}</p>
      </div>
    </div>
  )
}

function Panel({ children, title, subtitle, action }: { children: ReactNode; title?: string; subtitle?: string; action?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
      {title && (
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
