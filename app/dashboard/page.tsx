import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import {
  Home,
  Users,
  Settings,
  BarChart3,
  MessageSquare,
  Send,
  Inbox,
  ImageIcon,
  ArrowLeft,
  TrendingUp,
  Calendar,
  Clock,
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // جلب بيانات المستخدم
  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

  const isAdmin = profile?.role === "admin"

  // جلب إحصائيات المستخدم - استخدام data.length بدلاً من count
  const { data: individualData } = await supabase.from("individual_messages").select("id").eq("user_id", user.id)
  const individualCount = individualData?.length || 0

  const { data: bulkData } = await supabase.from("bulk_messages").select("id").eq("user_id", user.id)
  const bulkCount = bulkData?.length || 0

  const { data: incomingData } = await supabase
    .from("incoming_messages")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_read", false)
  const incomingCount = incomingData?.length || 0

  // جلب إحصائيات اليوم
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: todayIndividualData } = await supabase
    .from("individual_messages")
    .select("id")
    .eq("user_id", user.id)
    .gte("created_at", today.toISOString())
  const todayIndividual = todayIndividualData?.length || 0

  // جلب IDs الحملات الخاصة بالمستخدم أولاً
  const { data: userBulkMessages } = await supabase.from("bulk_messages").select("id").eq("user_id", user.id)

  const bulkMessageIds = userBulkMessages?.map((m) => m.id) || []

  let todayBulkRecipients = 0
  if (bulkMessageIds.length > 0) {
    const { data } = await supabase
      .from("bulk_message_recipients")
      .select("id")
      .in("bulk_message_id", bulkMessageIds)
      .gte("created_at", today.toISOString())

    todayBulkRecipients = data?.length || 0
  }

  const todayTotal = todayIndividual + todayBulkRecipients

  // أزرار التنقل السريع
  const quickLinks = [
    {
      title: "الرسائل الفردية",
      href: "/dashboard/individual",
      icon: MessageSquare,
      color: "bg-blue-500 hover:bg-blue-600",
      description: "إرسال رسائل مخصصة",
    },
    {
      title: "الرسائل الجماعية",
      href: "/dashboard/bulk",
      icon: Send,
      color: "bg-purple-500 hover:bg-purple-600",
      description: "حملات جماعية",
    },
    {
      title: "صندوق الوارد",
      href: "/dashboard/inbox",
      icon: Inbox,
      color: "bg-orange-500 hover:bg-orange-600",
      description: "الرسائل الواردة",
    },
    {
      title: "مكتبة الصور",
      href: "/dashboard/media",
      icon: ImageIcon,
      color: "bg-teal-500 hover:bg-teal-600",
      description: "إدارة الوسائط",
    },
  ]

  // أزرار الأدمن
  const adminLinks = [
    {
      title: "إدارة المستخدمين",
      href: "/admin/users",
      icon: Users,
      color: "bg-pink-500 hover:bg-pink-600",
      description: "إدارة الحسابات",
    },
    {
      title: "الإحصائيات الشاملة",
      href: "/analytics",
      icon: BarChart3,
      color: "bg-indigo-500 hover:bg-indigo-600",
      description: "تقارير مفصلة",
    },
    {
      title: "إعدادات الموقع",
      href: "/admin/settings",
      icon: Settings,
      color: "bg-gray-600 hover:bg-gray-700",
      description: "ضبط النظام",
    },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header with Logo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl p-2">
            <Image src="/logo.png" alt="RoseSmile" width={50} height={50} className="object-contain" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">مرحباً، {profile?.full_name || "المستخدم"}</h1>
            <p className="text-white/80 text-sm sm:text-base">إليك نظرة عامة على نشاطك اليوم</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20">
              <Home className="h-4 w-4" />
              الرئيسية
            </Button>
          </Link>
          <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
            <p className="text-xs text-white/70">رسائل اليوم</p>
            <p className="text-2xl font-bold">{todayTotal}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">الرسائل الفردية</p>
              <p className="text-2xl font-bold text-blue-700">{individualCount}</p>
            </div>
            <div className="bg-blue-500 rounded-lg p-2">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 font-medium">الحملات الجماعية</p>
              <p className="text-2xl font-bold text-purple-700">{bulkCount}</p>
            </div>
            <div className="bg-purple-500 rounded-lg p-2">
              <Send className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 font-medium">رسائل غير مقروءة</p>
              <p className="text-2xl font-bold text-orange-700">{incomingCount}</p>
            </div>
            <div className="bg-orange-500 rounded-lg p-2">
              <Inbox className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">حالة الحساب</p>
              <p className="text-xl font-bold text-green-700">{profile?.is_active ? "نشط" : "غير نشط"}</p>
            </div>
            <div className={`${profile?.is_active ? "bg-green-500" : "bg-red-500"} rounded-lg p-2`}>
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Access Buttons */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-pink-500" />
          الوصول السريع
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href}>
                <Card className="p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                  <div className={`${link.color} rounded-xl p-3 w-fit mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{link.title}</h3>
                  <p className="text-xs text-gray-500">{link.description}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-500" />
            أدوات الإدارة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {adminLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.href} href={link.href}>
                  <Card className="p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group border-2 border-dashed border-gray-200 hover:border-indigo-300">
                    <div className="flex items-center gap-4">
                      <div className={`${link.color} rounded-xl p-3 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{link.title}</h3>
                        <p className="text-xs text-gray-500">{link.description}</p>
                      </div>
                      <ArrowLeft className="h-5 w-5 text-gray-400 mr-auto group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Today's Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-500" />
            نشاط اليوم
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-teal-600">{todayIndividual}</p>
              <p className="text-sm text-teal-700">رسائل فردية</p>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-violet-600">{todayBulkRecipients}</p>
              <p className="text-sm text-violet-700">رسائل جماعية</p>
            </div>
          </div>
          <div className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl p-4 text-white text-center">
            <p className="text-sm opacity-80">إجمالي رسائل اليوم</p>
            <p className="text-4xl font-bold">{todayTotal}</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">معلومات الحساب</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600 text-sm">الاسم</span>
              <span className="font-medium text-gray-900">{profile?.full_name || "-"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600 text-sm">البريد الإلكتروني</span>
              <span className="font-medium text-gray-900 text-xs">{user.email || "-"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600 text-sm">رقم الهاتف</span>
              <span className="font-medium text-gray-900 text-sm" dir="ltr">
                {profile?.phone_number_id || "-"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 text-sm">نوع الحساب</span>
              <span
                className={`font-medium px-3 py-1 rounded-full text-xs ${isAdmin ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"}`}
              >
                {isAdmin ? "مدير" : "مستخدم"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
