"use client"

import { useState } from "react"
import Link from "next/link"
import { CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  TrendingUp,
  Users,
  Inbox,
  Send,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
  AlertTriangle,
  Gauge,
  Info,
  ShieldCheck,
} from "lucide-react"
import type { MessagingLimitInfo, QualityRating } from "@/lib/messaging-limit"
import DashboardCharts from "@/components/users/dashboard-charts"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"

const ACCEPTED_STATUSES = ["sent", "delivered", "read"]

interface Message {
  id: string
  status: string
  created_at: string
  sent_at?: string
  received_at?: string
  is_read?: boolean
  delivery_status?: string
  whatsapp_message_id?: string
  message_text?: string
}

interface UserDashboardClientProps {
  accountStatus: "active" | "paused" | "suspended"
  accountActiveUntil: string | null
  subscriptionExpiresAt: string | null
  subscriptionPriceCents: number
  userId: string
  messagingLimit: MessagingLimitInfo
  uniqueRecipients24h: number
  individualMessages: Message[]
  bulkMessages: any[]
  bulkRecipientsData: any[]
  incomingMessages: Message[]
}

export default function UserDashboardClient({
  accountStatus,
  accountActiveUntil,
  subscriptionExpiresAt,
  subscriptionPriceCents,
  userId,
  messagingLimit,
  uniqueRecipients24h,
  individualMessages,
  bulkMessages,
  bulkRecipientsData,
  incomingMessages,
}: UserDashboardClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month" | "all" | "custom">("today")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [confirmedDateRange, setConfirmedDateRange] = useState<DateRange | undefined>(undefined)

  const now = new Date()
  const riyadhOffset = 3 * 60 * 60 * 1000
  const riyadhNow = new Date(now.getTime() + riyadhOffset)

  const todayStart = new Date(riyadhNow)
  todayStart.setHours(0, 0, 0, 0)
  const todayStartUTC = new Date(todayStart.getTime() - riyadhOffset)

  const weekStart = new Date(riyadhNow)
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)
  const weekStartUTC = new Date(weekStart.getTime() - riyadhOffset)

  const monthStart = new Date(riyadhNow)
  monthStart.setDate(monthStart.getDate() - 30)
  monthStart.setHours(0, 0, 0, 0)
  const monthStartUTC = new Date(monthStart.getTime() - riyadhOffset)

  const filterByPeriod = (messages: Message[], period: typeof selectedPeriod) => {
    if (period === "all") return messages

    if (period === "custom" && confirmedDateRange?.from) {
      const startDate = new Date(confirmedDateRange.from)
      startDate.setHours(0, 0, 0, 0)

      const endDate = confirmedDateRange.to ? new Date(confirmedDateRange.to) : new Date(confirmedDateRange.from)
      endDate.setHours(23, 59, 59, 999)

      return messages.filter((m) => {
        const checkDate = m.sent_at || m.received_at || m.created_at
        if (!checkDate) return false
        const date = new Date(checkDate)
        return date >= startDate && date <= endDate
      })
    }

    const startDate = period === "today" ? todayStartUTC : period === "week" ? weekStartUTC : monthStartUTC

    return messages.filter((m) => {
      const checkDate = m.sent_at || m.received_at || m.created_at
      if (!checkDate) return false
      return new Date(checkDate) >= startDate
    })
  }

  const filterBulkByPeriod = (recipients: any[], period: typeof selectedPeriod) => {
    if (period === "all") return recipients

    if (period === "custom" && confirmedDateRange?.from) {
      const startDate = new Date(confirmedDateRange.from)
      startDate.setHours(0, 0, 0, 0)

      const endDate = confirmedDateRange.to ? new Date(confirmedDateRange.to) : new Date(confirmedDateRange.from)
      endDate.setHours(23, 59, 59, 999)

      return recipients.filter((r: any) => {
        const checkDate = r.created_at || r.sent_at
        if (!checkDate) return false
        const date = new Date(checkDate)
        return date >= startDate && date <= endDate
      })
    }

    const startDate = period === "today" ? todayStartUTC : period === "week" ? weekStartUTC : monthStartUTC
    return recipients.filter((r: any) => {
      const checkDate = r.created_at || r.sent_at
      return checkDate && new Date(checkDate) >= startDate
    })
  }

  const getStats = (period: typeof selectedPeriod) => {
    const filteredIndividual = filterByPeriod(individualMessages, period)
    const filteredIncoming = filterByPeriod(incomingMessages, period)
    // مستلمو الحملات بحالة "pending" هم مسودات لم تُرسل بعد، فلا تُحتسب كرسائل مرسلة
    const filteredBulk = filterBulkByPeriod(bulkRecipientsData, period).filter(
      (r: any) => (r.status || "pending") !== "pending",
    )

    // حساب الرسائل الفردية
    const individualTotal = filteredIndividual.length
    const individualAccepted = filteredIndividual.filter((m) => {
      if (ACCEPTED_STATUSES.includes(m.status)) {
        if (m.whatsapp_message_id) return true
        if (m.message_text) {
          try {
            const parsed = JSON.parse(m.message_text)
            return !!parsed.whatsapp_message_id
          } catch {
            return true
          }
        }
        return true
      }
      return false
    }).length
    const individualFailed = filteredIndividual.filter((m) => m.status === "failed").length
    const individualPending = individualTotal - individualAccepted - individualFailed

    // حساب الرسائل الجماعية
    const bulkTotal = filteredBulk.length
    const bulkAccepted = filteredBulk.filter((r: any) => {
      return ACCEPTED_STATUSES.includes(r.status)
    }).length
    const bulkFailed = filteredBulk.filter((r: any) => r.status === "failed").length
    const bulkPending = bulkTotal - bulkAccepted - bulkFailed

    const totalAttempted = individualTotal + bulkTotal
    const totalAccepted = individualAccepted + bulkAccepted
    const totalFailed = individualFailed + bulkFailed
    const totalPending = individualPending + bulkPending

    const successRate = totalAttempted > 0 ? ((totalAccepted / totalAttempted) * 100).toFixed(1) : "0"

    const incomingTotal = filteredIncoming.length
    const unreadIncoming = filteredIncoming.filter((m) => !m.is_read).length

    return {
      totalAttempted,
      totalAccepted,
      totalFailed,
      totalPending,
      successRate,
      incomingTotal,
      unreadIncoming,
      individualTotal,
      bulkTotal,
    }
  }

  const currentStats = getStats(selectedPeriod)
  const todayStats = getStats("today")
  const weekStats = getStats("week")
  const monthStats = getStats("month")

  const periodLabels = {
    today: "اليوم",
    week: "الأسبوع",
    month: "الشهر",
    all: "الكل",
    custom: "مخصص",
  }

  const handleDateConfirm = () => {
    if (dateRange?.from) {
      setConfirmedDateRange(dateRange)
      setSelectedPeriod("custom")
    }
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    if (!range) {
      setSelectedPeriod("today")
      setConfirmedDateRange(undefined)
    }
  }

  const mainCards = [
    {
      title: "إجمالي المحاولات",
      value: currentStats.totalAttempted,
      icon: Send,
      iconBg: "bg-slate-900",
    },
    {
      title: "مقبولة من Meta",
      value: currentStats.totalAccepted,
      icon: CheckCircle,
      iconBg: "bg-emerald-600",
      subtitle: "تم قبولها من WhatsApp",
    },
    {
      title: "الرسائل الفاشلة",
      value: currentStats.totalFailed,
      icon: XCircle,
      iconBg: "bg-rose-500",
    },
    {
      title: "الرسائل الواردة",
      value: currentStats.incomingTotal,
      icon: Inbox,
      iconBg: "bg-sky-600",
      badge: currentStats.unreadIncoming > 0 ? `${currentStats.unreadIncoming} غير مقروءة` : undefined,
    },
  ]

  const periodCards = [
    {
      title: "إحصائيات اليوم",
      icon: Calendar,
      stats: todayStats,
      iconBg: "bg-sky-600",
    },
    {
      title: "إحصائيات الأسبوع",
      icon: TrendingUp,
      stats: weekStats,
      iconBg: "bg-slate-900",
    },
    {
      title: "إحصائيات الشهر",
      icon: BarChart3,
      stats: monthStats,
      iconBg: "bg-emerald-600",
    },
  ]

  const statusDetails = {
    active: {
      label: "نشط",
      description: "يمكنك الإرسال",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      dotClassName: "bg-emerald-500",
    },
    paused: {
      label: "موقوف مؤقتاً",
      description: "الرجاء التواصل مع الدعم الفني",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      dotClassName: "bg-amber-500",
    },
    suspended: {
      label: "غير نشط",
      description: "الرجاء تجديد الاشتراك الشهري",
      className: "border-red-200 bg-red-50 text-red-700",
      dotClassName: "bg-red-500",
    },
  }[accountStatus]

  const statusBar = (
    <div
      role="status"
      aria-label={`حالة المستخدم: ${statusDetails.label}`}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-3 shadow-sm",
        statusDetails.className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("h-3 w-3 rounded-full shadow-sm", statusDetails.dotClassName)} aria-hidden="true" />
        <div>
          <p className="text-sm font-bold">حالة الحساب: {statusDetails.label}</p>
          <p className="mt-0.5 text-xs opacity-80">
            {statusDetails.description}
            {accountStatus === "active" && accountActiveUntil
              ? ` حتى ${new Date(accountActiveUntil).toLocaleDateString("ar-SA")}`
              : ""}
          </p>
        </div>
      </div>
      <Link
        href={`/users/${userId}/subscription`}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
      >
        <CreditCard className="h-3.5 w-3.5" />
        {accountStatus === "active" ? "إدارة الاشتراك" : "تجديد الاشتراك"}
      </Link>
    </div>
  )

  const rateColor = (rate: string) =>
    Number(rate) >= 80 ? "text-emerald-600" : Number(rate) >= 50 ? "text-amber-600" : "text-rose-600"

  return (
    <div className="space-y-6">
      {statusBar}

      {/* العنوان وفلاتر الفترة */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">لوحة التحكم</h2>
          <p className="text-sm text-slate-500 mt-1">نظرة شاملة على نشاطك وحدود الإرسال الخاصة بحسابك</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onConfirm={handleDateConfirm}
          />
          <Tabs
            value={selectedPeriod}
            onValueChange={(v) => {
              setSelectedPeriod(v as any)
              if (v !== "custom") {
                setDateRange(undefined)
                setConfirmedDateRange(undefined)
              }
            }}
          >
            <TabsList className="bg-slate-100 p-1 rounded-xl shadow-sm">
              {(["today", "week", "month", "all"] as const).map((p) => (
                <TabsTrigger
                  key={p}
                  value={p}
                  className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900"
                >
                  {periodLabels[p]}
                </TabsTrigger>
              ))}
              {confirmedDateRange?.from && (
                <TabsTrigger
                  value="custom"
                  className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900"
                >
                  مخصص
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* المؤشرات الرئيسية للفترة المختارة */}
      <section aria-labelledby="kpi-title" className="space-y-3">
        <h3 id="kpi-title" className="text-sm font-semibold text-slate-500">
          ملخص {periodLabels[selectedPeriod]}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {mainCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title} className="border border-slate-200 bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">{card.title}</p>
                    <div className={cn("p-2 rounded-lg", card.iconBg)}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-slate-800 tabular-nums">{card.value.toLocaleString()}</p>
                  {card.badge ? (
                    <span className="mt-1 inline-block bg-red-100 text-red-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      {card.badge}
                    </span>
                  ) : card.subtitle ? (
                    <p className="mt-1 text-[11px] text-slate-400">{card.subtitle}</p>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
          <Card className="col-span-2 lg:col-span-1 border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">معدل القبول</p>
                <div className="p-2 rounded-lg bg-indigo-600">
                  <Activity className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className={cn("mt-2 text-3xl font-bold tabular-nums", rateColor(currentStats.successRate))}>
                {currentStats.successRate}%
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    Number(currentStats.successRate) >= 80
                      ? "bg-emerald-500"
                      : Number(currentStats.successRate) >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500",
                  )}
                  style={{ width: `${Math.min(100, Number(currentStats.successRate))}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* حد الإرسال + إحصائيات الفترات */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <MessagingLimitCard info={messagingLimit} used={uniqueRecipients24h} userId={userId} />
        </div>

        <section aria-labelledby="periods-title" className="xl:col-span-2 space-y-3">
          <h3 id="periods-title" className="text-sm font-semibold text-slate-500">
            إحصائيات سريعة
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {periodCards.map((period) => {
              const Icon = period.icon
              return (
                <Card
                  key={period.title}
                  className="aspect-square border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="flex h-full flex-col items-center justify-between p-2 sm:p-3 text-center">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("p-1 rounded-md", period.iconBg)}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-slate-700">
                        {period.title.replace("إحصائيات ", "")}
                      </span>
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-slate-800 tabular-nums leading-none">
                        {period.stats.totalAttempted.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">مرسلة</p>
                    </div>
                    <div className="flex w-full items-center justify-around text-[10px] sm:text-[11px] font-semibold tabular-nums">
                      <span className="text-emerald-600" title="مقبولة">
                        ✓ {period.stats.totalAccepted.toLocaleString()}
                      </span>
                      <span className="text-rose-600" title="فاشلة">
                        ✕ {period.stats.totalFailed.toLocaleString()}
                      </span>
                      <span className="text-sky-600" title="واردة">
                        ↓ {period.stats.incomingTotal.toLocaleString()}
                      </span>
                    </div>
                    <span className={cn("text-[11px] font-bold", rateColor(period.stats.successRate))}>
                      {period.stats.successRate}% قبول
                    </span>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-500" />
                تفاصيل الإرسال ({periodLabels[selectedPeriod]})
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  { label: "رسائل فردية", value: currentStats.individualTotal, color: "text-blue-600" },
                  { label: "رسائل جماعية", value: currentStats.bulkTotal, color: "text-purple-600" },
                  { label: "إجمالي الحملات", value: bulkMessages.length, color: "text-emerald-600" },
                  { label: "معلّقة", value: currentStats.totalPending, color: "text-amber-600" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-50 p-2">
                    <p className={cn("text-xl font-bold tabular-nums", item.color)}>{item.value.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        "مقبولة من Meta" تعني أن WhatsApp API قبل الرسالة. التسليم الفعلي للمستلم يعتمد على صحة الرقم وحالة حساب
        WhatsApp الخاص به.
      </p>

      {/* الرسوم البيانية */}
      <DashboardCharts
        individualMessages={filterByPeriod(individualMessages, selectedPeriod)}
        incomingMessages={filterByPeriod(incomingMessages, selectedPeriod)}
      />
    </div>
  )
}

const QUALITY_DETAILS: Record<QualityRating, { label: string; className: string; hint: string }> = {
  GREEN: {
    label: "جودة عالية",
    className: "bg-emerald-100 text-emerald-700",
    hint: "جودة رسائلك ممتازة وتؤهلك لرفع الحد تلقائياً.",
  },
  YELLOW: {
    label: "جودة متوسطة",
    className: "bg-amber-100 text-amber-700",
    hint: "انتبه لمحتوى رسائلك وتجنّب الإرسال لغير المهتمين حتى لا تنخفض الجودة.",
  },
  RED: {
    label: "جودة منخفضة",
    className: "bg-rose-100 text-rose-700",
    hint: "لن يتم رفع الحد بجودة منخفضة، وقد يتم تقييد الرقم. قلّل الإرسال وحسّن المحتوى.",
  },
  UNKNOWN: {
    label: "جودة غير محددة",
    className: "bg-slate-100 text-slate-600",
    hint: "لم تحدد Meta جودة الرقم بعد، وغالباً يحدث ذلك للأرقام الجديدة.",
  },
}

const NEXT_TIER: Record<string, string> = {
  TIER_50: "250",
  TIER_250: "2,000",
  TIER_1K: "10,000",
  TIER_2K: "10,000",
  TIER_10K: "100,000",
  TIER_100K: "غير محدود",
}

function MessagingLimitCard({ info, used, userId }: { info: MessagingLimitInfo; used: number; userId: string }) {
  if (!info.connected) {
    return (
      <Card className="h-full border border-dashed border-slate-300 bg-white">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <Gauge className="h-8 w-8 text-slate-400" />
          <p className="font-bold text-slate-700">حد الإرسال من Meta</p>
          <p className="text-sm text-slate-500">اربط حساب واتساب للأعمال لعرض حد الإرسال الفعلي الخاص بك.</p>
          <Link
            href={`/users/${userId}/settings`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            ربط الحساب من الإعدادات
          </Link>
        </CardContent>
      </Card>
    )
  }

  const quality = QUALITY_DETAILS[info.quality]
  const unlimited = info.tier !== null && info.limit === null
  const percent = info.limit ? Math.min(100, Math.round((used / info.limit) * 100)) : 0
  const remaining = info.limit ? Math.max(0, info.limit - used) : null
  const barColor = percent >= 90 ? "bg-rose-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"
  const nextTier = info.tier ? NEXT_TIER[info.tier] : undefined

  return (
    <Card className="h-full border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2.5">
              <Gauge className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-800">حد الإرسال من Meta</CardTitle>
              <p className="text-xs text-slate-500" dir="auto">
                {info.verifiedName || "رقم واتساب"}
                {info.displayPhoneNumber ? (
                  <span dir="ltr" className="ms-1">
                    · {info.displayPhoneNumber}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", quality.className)}>{quality.label}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {info.error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            تعذر جلب حد الإرسال من Meta: {info.error}
          </div>
        ) : !info.tier ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            لم تُرجع Meta حد الإرسال لهذا الرقم بعد. يظهر الحد عادةً بعد تفعيل الرقم وإرسال أول رسائل القوالب.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">المستخدم خلال آخر 24 ساعة</p>
                <p className="text-3xl font-bold text-slate-800 tabular-nums">
                  {used.toLocaleString()}
                  <span className="text-base font-medium text-slate-400">
                    {" "}
                    / {unlimited ? "غير محدود" : info.limit!.toLocaleString()}
                  </span>
                </p>
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-500">المتبقي</p>
                <p className="text-xl font-bold text-emerald-600 tabular-nums">
                  {unlimited ? "∞" : remaining!.toLocaleString()}
                </p>
              </div>
            </div>
            {!unlimited && (
              <div>
                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="نسبة استخدام حد الإرسال"
                >
                  <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{percent}% من الحد اليومي</p>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <InfoTile label="الفئة الحالية" value={info.tier ? info.tier.replace("TIER_", "") : "—"} />
          <InfoTile label="مستوى الحد" value={info.scope === "portfolio" ? "المحفظة التجارية" : info.scope === "phone" ? "رقم الهاتف" : "—"} />
          <InfoTile label="حالة الرقم" value={info.phoneStatus || "—"} />
          <InfoTile label="الإنتاجية" value={info.throughput === "HIGH" ? "عالية" : info.throughput ? "قياسية" : "—"} />
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 space-y-1.5">
          <p className="flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-sky-500" />
            يحتسب الحد بعدد العملاء الفريدين الذين تبدأ معهم محادثة برسائل القوالب خلال 24 ساعة متتالية. الرد على
            العملاء خلال نافذة خدمة العملاء (24 ساعة من آخر رسالة لهم) لا يُحتسب ضمن الحد.
          </p>
          <p className="flex items-start gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />
            {nextTier
              ? `ترفع Meta الحد تلقائياً إلى ${nextTier} عند استخدام نصف حدك الحالي على الأقل خلال 7 أيام مع الحفاظ على جودة غير منخفضة.`
              : unlimited
                ? "حسابك على أعلى فئة إرسال (غير محدود)."
                : "ترفع Meta الحد تلقائياً عند الاستخدام المنتظم مع الحفاظ على جودة جيدة."}
            {info.tier === "TIER_250" ? " توثيق النشاط التجاري في Meta يرفع الحد مباشرة." : ""}
          </p>
          <p className="flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
            {quality.hint}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-2">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="truncate text-xs font-bold text-slate-700" title={value}>
        {value}
      </p>
    </div>
  )
}
