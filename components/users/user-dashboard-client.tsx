"use client"

import { useState } from "react"
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
  ArrowUpRight,
  Activity,
  BarChart3,
  AlertTriangle,
} from "lucide-react"
import DashboardCharts from "@/components/users/dashboard-charts"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"

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
  individualMessages: Message[]
  bulkMessages: any[]
  bulkRecipientsData: any[]
  incomingMessages: Message[]
}

export default function UserDashboardClient({
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
    const filteredBulk = filterBulkByPeriod(bulkRecipientsData, period)

    // حساب الرسائل الفردية
    const individualTotal = filteredIndividual.length
    const individualAccepted = filteredIndividual.filter((m) => {
      if (m.status === "sent" || m.status === "delivered") {
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
      if (r.status === "sent" || r.status === "delivered") {
        if (r.whatsapp_message_id) return true
        return true
      }
      return false
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
      gradient: "from-blue-500 via-blue-600 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50",
      iconBg: "bg-blue-500",
      change: "+12%",
    },
    {
      title: "مقبولة من Meta",
      value: currentStats.totalAccepted,
      icon: CheckCircle,
      gradient: "from-green-500 via-green-600 to-emerald-600",
      bgGradient: "from-green-50 to-emerald-50",
      iconBg: "bg-green-500",
      change: "+8%",
      subtitle: "تم قبولها من WhatsApp",
    },
    {
      title: "الرسائل الفاشلة",
      value: currentStats.totalFailed,
      icon: XCircle,
      gradient: "from-red-500 via-red-600 to-rose-600",
      bgGradient: "from-red-50 to-rose-50",
      iconBg: "bg-red-500",
      change: "-3%",
    },
    {
      title: "الرسائل الواردة",
      value: currentStats.incomingTotal,
      icon: Inbox,
      gradient: "from-purple-500 via-purple-600 to-pink-600",
      bgGradient: "from-purple-50 to-pink-50",
      iconBg: "bg-purple-500",
      change: "+15%",
      badge: currentStats.unreadIncoming > 0 ? `${currentStats.unreadIncoming} غير مقروءة` : undefined,
    },
  ]

  const periodCards = [
    {
      title: "إحصائيات اليوم",
      icon: Calendar,
      stats: todayStats,
      gradient: "from-cyan-500 to-teal-500",
      bgGradient: "from-cyan-50 to-teal-50",
    },
    {
      title: "إحصائيات الأسبوع",
      icon: TrendingUp,
      stats: weekStats,
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-50 to-purple-50",
    },
    {
      title: "إحصائيات الشهر",
      icon: BarChart3,
      stats: monthStats,
      gradient: "from-pink-500 to-rose-500",
      bgGradient: "from-pink-50 to-rose-50",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            لوحة التحكم
          </h2>
          <p className="text-sm text-slate-600 mt-1">نظرة شاملة على نشاطك</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
              <TabsTrigger
                value="today"
                className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900"
              >
                اليوم
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900"
              >
                الأسبوع
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900"
              >
                الشهر
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900"
              >
                الكل
              </TabsTrigger>
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

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>ملاحظة:</strong> "مقبولة من Meta" تعني أن WhatsApp API قبل الرسالة. التسليم الفعلي للمستلم يعتمد على
            صحة الرقم وحالة حساب WhatsApp الخاص به.
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <CardContent className="relative pt-8 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#334155" strokeWidth="8" fill="none" />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={
                      Number(currentStats.successRate) >= 80
                        ? "#22c55e"
                        : Number(currentStats.successRate) >= 50
                          ? "#eab308"
                          : "#ef4444"
                    }
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${Number(currentStats.successRate) * 3.51} 351`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{currentStats.successRate}%</span>
                  <span className="text-xs text-slate-400">معدل القبول</span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">إحصائيات {periodLabels[selectedPeriod]}</h3>
                <p className="text-slate-300">
                  {Number(currentStats.successRate) >= 80
                    ? "أداء ممتاز"
                    : Number(currentStats.successRate) >= 50
                      ? "أداء جيد"
                      : "يحتاج تحسين"}
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400 font-medium">
                    {currentStats.totalAttempted.toLocaleString()} محاولة
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-green-400">{currentStats.totalAccepted.toLocaleString()}</div>
                <div className="text-slate-300 mt-2 flex items-center gap-2 justify-center">
                  <CheckCircle className="h-4 w-4" />
                  مقبولة
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-red-400">{currentStats.totalFailed.toLocaleString()}</div>
                <div className="text-slate-300 mt-2 flex items-center gap-2 justify-center">
                  <XCircle className="h-4 w-4" />
                  فشل
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card
              key={card.title}
              className={cn(
                "relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2",
                "bg-gradient-to-br",
                card.bgGradient,
              )}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
                <div className={`w-full h-full bg-gradient-to-br ${card.gradient} rounded-full blur-2xl`}></div>
              </div>
              <CardContent className="relative pt-6 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("p-3 rounded-xl shadow-lg", card.iconBg)}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  {card.change && (
                    <div className="flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      <ArrowUpRight className="h-3 w-3" />
                      {card.change}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600">{card.title}</p>
                  <p className="text-4xl font-bold text-slate-800">{card.value.toLocaleString()}</p>
                  {card.badge && (
                    <div className="inline-block bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full mt-2">
                      {card.badge}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {periodCards.map((period) => {
          const Icon = period.icon
          return (
            <Card
              key={period.title}
              className={cn(
                "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1",
                "bg-gradient-to-br",
                period.bgGradient,
              )}
            >
              <div className="absolute inset-0 opacity-20">
                <div
                  className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${period.gradient} rounded-full blur-2xl`}
                ></div>
              </div>
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-slate-800">{period.title}</CardTitle>
                  <div className={cn("p-2 rounded-lg shadow-md bg-gradient-to-br", period.gradient)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">الرسائل المرسلة</p>
                    <p className="text-4xl font-bold text-slate-800">{period.stats.totalAttempted.toLocaleString()}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-slate-600 font-medium">القبول</p>
                    <p
                      className={cn(
                        "text-3xl font-bold",
                        Number(period.stats.successRate) >= 80
                          ? "text-green-600"
                          : Number(period.stats.successRate) >= 50
                            ? "text-yellow-600"
                            : "text-red-600",
                      )}
                    >
                      {period.stats.successRate}%
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4 border-t-2 border-white/50">
                  <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                    <p className="text-2xl font-bold text-green-600">{period.stats.totalAccepted.toLocaleString()}</p>
                    <p className="text-xs text-slate-600 font-medium mt-1">مقبولة</p>
                  </div>
                  <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                    <p className="text-2xl font-bold text-red-600">{period.stats.totalFailed.toLocaleString()}</p>
                    <p className="text-xs text-slate-600 font-medium mt-1">فاشلة</p>
                  </div>
                  <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                    <p className="text-2xl font-bold text-purple-600">{period.stats.incomingTotal.toLocaleString()}</p>
                    <p className="text-xs text-slate-600 font-medium mt-1">واردة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-orange-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            تفاصيل الحملات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="text-3xl font-bold text-blue-600">{currentStats.individualTotal.toLocaleString()}</div>
              <div className="text-sm text-slate-600 font-medium mt-2">رسائل فردية</div>
            </div>
            <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="text-3xl font-bold text-purple-600">{currentStats.bulkTotal.toLocaleString()}</div>
              <div className="text-sm text-slate-600 font-medium mt-2">رسائل جماعية</div>
            </div>
            <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="text-3xl font-bold text-green-600">{bulkMessages.length.toLocaleString()}</div>
              <div className="text-sm text-slate-600 font-medium mt-2">حملات نشطة</div>
            </div>
            <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="text-3xl font-bold text-orange-600">{currentStats.incomingTotal.toLocaleString()}</div>
              <div className="text-sm text-slate-600 font-medium mt-2">رسائل واردة</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الرسوم البيانية */}
      <DashboardCharts
        individualMessages={filterByPeriod(individualMessages, selectedPeriod)}
        bulkRecipientsData={filterBulkByPeriod(bulkRecipientsData, selectedPeriod)}
        incomingMessages={filterByPeriod(incomingMessages, selectedPeriod)}
      />
    </div>
  )
}
