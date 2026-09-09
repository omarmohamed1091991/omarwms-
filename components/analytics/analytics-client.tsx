"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Home,
  BarChart3,
  Send,
  Calendar,
  Mail,
  Sparkles,
  Clock,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker"

interface PeriodStats {
  totalSent: number
  successful: number
  failed: number
  incoming: number
  successRate?: string
}

interface UserStats {
  totalSent: number
  totalSuccessful: number
  totalFailed: number
  totalIncoming: number
  unreadIncoming: number
  successRate: string
  individualMessages: number
  bulkMessages: number
  today: PeriodStats
  week: PeriodStats
  month: PeriodStats
  rawData?: {
    individualMessages: any[]
    bulkRecipients: any[]
    incomingMessages: any[]
  }
}

interface UserWithStats {
  id: string
  full_name: string | null
  phone_number: string | null
  email: string | null
  is_active: boolean
  created_at: string
  stats: UserStats
}

interface TotalStats {
  totalSent: number
  totalSuccessful: number
  totalFailed: number
  totalIncoming: number
  unreadIncoming: number
  successRate: string
  totalUsers: number
  activeUsers: number
  today: PeriodStats
  week: PeriodStats
  month: PeriodStats
}

interface AnalyticsClientProps {
  users: UserWithStats[]
  totalStats: TotalStats
}

export function AnalyticsClient({ users, totalStats }: AnalyticsClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month" | "all" | "custom">("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [confirmedDateRange, setConfirmedDateRange] = useState<DateRange | undefined>(undefined)
  const router = useRouter()

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.phone_number?.includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchLower)
    )
  })

  const calculateUserCustomStats = (user: UserWithStats, startDate: Date, endDate: Date): PeriodStats => {
    if (!user.stats.rawData) {
      return { totalSent: 0, successful: 0, failed: 0, incoming: 0, successRate: "0.0" }
    }

    const { individualMessages, bulkRecipients, incomingMessages } = user.stats.rawData

    const filteredIndividual =
      individualMessages?.filter((m: any) => {
        const date = new Date(m.sent_at || m.created_at)
        return date >= startDate && date <= endDate
      }) || []

    const filteredBulk =
      bulkRecipients?.filter((r: any) => {
        const date = new Date(r.sent_at || r.created_at)
        return date >= startDate && date <= endDate
      }) || []

    const filteredIncoming =
      incomingMessages?.filter((m: any) => {
        const date = new Date(m.received_at)
        return date >= startDate && date <= endDate
      }) || []

    const totalSent = filteredIndividual.length + filteredBulk.length
    const successful =
      filteredIndividual.filter((m: any) => m.status === "sent" || m.status === "delivered").length +
      filteredBulk.filter((r: any) => r.status === "sent" || r.status === "delivered").length
    const failed =
      filteredIndividual.filter((m: any) => m.status === "failed").length +
      filteredBulk.filter((r: any) => r.status === "failed").length

    return {
      totalSent,
      successful,
      failed,
      incoming: filteredIncoming.length,
      successRate: totalSent > 0 ? ((successful / totalSent) * 100).toFixed(1) : "0.0",
    }
  }

  const getUserDisplayStats = (user: UserWithStats): PeriodStats => {
    if (selectedPeriod === "custom" && confirmedDateRange?.from) {
      const startDate = new Date(confirmedDateRange.from)
      startDate.setHours(0, 0, 0, 0)
      const endDate = confirmedDateRange.to ? new Date(confirmedDateRange.to) : new Date(confirmedDateRange.from)
      endDate.setHours(23, 59, 59, 999)
      return calculateUserCustomStats(user, startDate, endDate)
    }

    switch (selectedPeriod) {
      case "today":
        return user.stats.today
      case "week":
        return user.stats.week
      case "month":
        return user.stats.month
      default:
        return {
          totalSent: user.stats.totalSent,
          successful: user.stats.totalSuccessful,
          failed: user.stats.totalFailed,
          incoming: user.stats.totalIncoming,
          successRate: user.stats.successRate,
        }
    }
  }

  const getDisplayStats = (): PeriodStats & { successRate: string } => {
    if (selectedPeriod === "custom" && confirmedDateRange?.from) {
      const startDate = new Date(confirmedDateRange.from)
      startDate.setHours(0, 0, 0, 0)
      const endDate = confirmedDateRange.to ? new Date(confirmedDateRange.to) : new Date(confirmedDateRange.from)
      endDate.setHours(23, 59, 59, 999)

      let totalSent = 0
      let successful = 0
      let failed = 0
      let incoming = 0

      users.forEach((user) => {
        const userStats = calculateUserCustomStats(user, startDate, endDate)
        totalSent += userStats.totalSent
        successful += userStats.successful
        failed += userStats.failed
        incoming += userStats.incoming
      })

      return {
        totalSent,
        successful,
        failed,
        incoming,
        successRate: totalSent > 0 ? ((successful / totalSent) * 100).toFixed(1) : "0.0",
      }
    }

    switch (selectedPeriod) {
      case "today":
        return {
          ...totalStats.today,
          successRate:
            totalStats.today.totalSent > 0
              ? ((totalStats.today.successful / totalStats.today.totalSent) * 100).toFixed(1)
              : "0.0",
        }
      case "week":
        return {
          ...totalStats.week,
          successRate:
            totalStats.week.totalSent > 0
              ? ((totalStats.week.successful / totalStats.week.totalSent) * 100).toFixed(1)
              : "0.0",
        }
      case "month":
        return {
          ...totalStats.month,
          successRate:
            totalStats.month.totalSent > 0
              ? ((totalStats.month.successful / totalStats.month.totalSent) * 100).toFixed(1)
              : "0.0",
        }
      default:
        return {
          totalSent: totalStats.totalSent,
          successful: totalStats.totalSuccessful,
          failed: totalStats.totalFailed,
          incoming: totalStats.totalIncoming,
          successRate: totalStats.successRate,
        }
    }
  }

  const displayStats = getDisplayStats()

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
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
      setConfirmedDateRange(undefined)
      if (selectedPeriod === "custom") {
        setSelectedPeriod("all")
      }
    }
  }

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period as any)
    if (period !== "custom") {
      setDateRange(undefined)
      setConfirmedDateRange(undefined)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 relative">
                <Image src="/logo.png" alt="RoseSmile Logo" fill className="object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">الإحصائيات الشاملة</h1>
                <p className="text-xs text-muted-foreground">نظام واتساب RoseSmile</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-1.5">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                تحديث
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push("/")} className="gap-1.5">
                <Home className="h-4 w-4" />
                الصفحة الرئيسية
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/admin")}
                className="gap-1.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              >
                <BarChart3 className="h-4 w-4" />
                لوحة التحكم
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 p-6 text-white shadow-xl">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left side - Quick stats */}
            <div className="flex items-center gap-6">
              <div className="text-center px-6 py-3 bg-white/15 rounded-xl backdrop-blur-sm border border-white/20">
                <p className="text-4xl font-bold">{displayStats.successRate}%</p>
                <p className="text-sm text-white/80 flex items-center justify-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  معدل النجاح
                </p>
              </div>
              <div className="text-center px-6 py-3 bg-white/15 rounded-xl backdrop-blur-sm border border-white/20">
                <p className="text-4xl font-bold text-pink-200">{totalStats.activeUsers}</p>
                <p className="text-sm text-white/80 flex items-center justify-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  نشط
                </p>
              </div>
              <div className="text-center px-6 py-3 bg-white/15 rounded-xl backdrop-blur-sm border border-white/20">
                <p className="text-4xl font-bold">{totalStats.totalUsers}</p>
                <p className="text-sm text-white/80 flex items-center justify-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  مستخدم
                </p>
              </div>
            </div>

            {/* Right side - Welcome message */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-2">
                <span className="text-sm text-white/80">لوحة الإحصائيات المتقدمة</span>
                <Sparkles className="h-4 w-4 text-yellow-300" />
              </div>
              <h2 className="text-2xl font-bold mb-1">مرحباً بك في مركز التحليلات</h2>
              <p className="text-white/80 text-sm">نظرة شاملة على أداء النظام وجميع المستخدمين</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today */}
          <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700">اليوم</h3>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">الرسائل المرسلة</p>
                  <p className="text-2xl font-bold text-slate-800">{totalStats.today.totalSent.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground mb-1">معدل النجاح</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {totalStats.today.totalSent > 0
                      ? ((totalStats.today.successful / totalStats.today.totalSent) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <div className="flex-1 text-center py-2 bg-emerald-50 rounded-lg">
                  <p className="text-lg font-bold text-emerald-600">{totalStats.today.successful.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ناجحة</p>
                </div>
                <div className="flex-1 text-center py-2 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-500">{totalStats.today.failed.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">فاشلة</p>
                </div>
                <div className="flex-1 text-center py-2 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">{totalStats.today.incoming.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">واردة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700">هذا الأسبوع</h3>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">الرسائل المرسلة</p>
                  <p className="text-2xl font-bold text-slate-800">{totalStats.week.totalSent.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground mb-1">معدل النجاح</p>
                  <p className="text-xl font-bold text-indigo-600">
                    {totalStats.week.totalSent > 0
                      ? ((totalStats.week.successful / totalStats.week.totalSent) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <div className="flex-1 text-center py-2 bg-emerald-50 rounded-lg">
                  <p className="text-lg font-bold text-emerald-600">{totalStats.week.successful.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ناجحة</p>
                </div>
                <div className="flex-1 text-center py-2 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-500">{totalStats.week.failed.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">فاشلة</p>
                </div>
                <div className="flex-1 text-center py-2 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">{totalStats.week.incoming.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">واردة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Month */}
          <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700">هذا الشهر</h3>
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-pink-600" />
                </div>
              </div>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">الرسائل المرسلة</p>
                  <p className="text-2xl font-bold text-slate-800">{totalStats.month.totalSent.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground mb-1">معدل النجاح</p>
                  <p className="text-xl font-bold text-pink-600">
                    {totalStats.month.totalSent > 0
                      ? ((totalStats.month.successful / totalStats.month.totalSent) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <div className="flex-1 text-center py-2 bg-emerald-50 rounded-lg">
                  <p className="text-lg font-bold text-emerald-600">{totalStats.month.successful.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ناجحة</p>
                </div>
                <div className="flex-1 text-center py-2 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-500">{totalStats.month.failed.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">فاشلة</p>
                </div>
                <div className="flex-1 text-center py-2 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">{totalStats.month.incoming.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">واردة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200/80 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">تفاصيل الإحصائيات</CardTitle>
              </div>
              <Tabs value={selectedPeriod} onValueChange={handlePeriodChange}>
                <TabsList className="bg-slate-100/80 p-1 rounded-xl h-auto">
                  <TabsTrigger
                    value="month"
                    className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    الشهر
                  </TabsTrigger>
                  <TabsTrigger
                    value="week"
                    className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    الأسبوع
                  </TabsTrigger>
                  <TabsTrigger
                    value="today"
                    className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    اليوم
                  </TabsTrigger>
                  <TabsTrigger
                    value="all"
                    className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    الكل
                  </TabsTrigger>
                  {confirmedDateRange?.from && (
                    <TabsTrigger
                      value="custom"
                      className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      مخصص
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl border border-indigo-100">
                <div className="w-12 h-12 mx-auto mb-3 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <Send className="h-6 w-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{displayStats.totalSent.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">إجمالي المرسل</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-100">
                <div className="w-12 h-12 mx-auto mb-3 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{displayStats.successful.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">الناجحة</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl border border-red-100">
                <div className="w-12 h-12 mx-auto mb-3 bg-red-500 rounded-xl flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{displayStats.failed.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">الفاشلة</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-100">
                <div className="w-12 h-12 mx-auto mb-3 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{displayStats.incoming.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">الواردة</p>
              </div>
            </div>

            {/* Success Rate Circle */}
            <div className="flex justify-center py-4">
              <div className="relative">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-slate-100"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${Number(displayStats.successRate) * 4.4} 440`}
                    strokeLinecap="round"
                    className="text-emerald-500 transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-800">{displayStats.successRate}%</span>
                  <span className="text-sm text-muted-foreground">معدل النجاح</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">إحصائيات المستخدمين التفصيلية</CardTitle>
                  <p className="text-sm text-muted-foreground">{filteredUsers.length} مستخدم</p>
                </div>
              </div>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                onConfirm={handleDateConfirm}
              />
            </div>

            {selectedPeriod === "custom" && confirmedDateRange?.from && (
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  الفترة المختارة: من{" "}
                  <span className="font-semibold">{confirmedDateRange.from.toLocaleDateString("ar-SA")}</span>
                  {confirmedDateRange.to && (
                    <>
                      {" "}
                      إلى <span className="font-semibold">{confirmedDateRange.to.toLocaleDateString("ar-SA")}</span>
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="relative mt-4">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="بحث عن مستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-slate-50/50 border-slate-200"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-right p-4 font-semibold text-slate-600 text-sm">المستخدم</th>
                    <th className="text-center p-4 font-semibold text-slate-600 text-sm">الحالة</th>
                    <th className="text-center p-4 font-semibold text-slate-600 text-sm">إجمالي المرسل</th>
                    <th className="text-center p-4 font-semibold text-slate-600 text-sm">تم التسليم</th>
                    <th className="text-center p-4 font-semibold text-slate-600 text-sm">فشل</th>
                    <th className="text-center p-4 font-semibold text-slate-600 text-sm">واردة</th>
                    <th className="text-center p-4 font-semibold text-slate-600 text-sm">معدل النجاح</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => {
                    const userStats = getUserDisplayStats(user)
                    const successRate = Number.parseFloat(userStats.successRate || "0")
                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-all duration-200 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                        }`}
                        onClick={() => router.push(`/users/${user.id}`)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                              {user.full_name?.charAt(0) || user.phone_number?.charAt(0) || "U"}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{user.full_name || "بدون اسم"}</p>
                              <p className="text-sm text-muted-foreground">{user.phone_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <Badge
                            variant={user.is_active ? "default" : "secondary"}
                            className={user.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}
                          >
                            {user.is_active ? "نشط" : "غير نشط"}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-slate-700">{userStats.totalSent.toLocaleString()}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-emerald-600">
                            {userStats.successful.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-red-500">{userStats.failed.toLocaleString()}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-blue-600">{userStats.incoming.toLocaleString()}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${successRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-slate-600 w-14 text-left">
                              {userStats.successRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-slate-200/80 py-4 mt-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          نظام واتساب - RoseSmile - جميع الحقوق محفوظة © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
