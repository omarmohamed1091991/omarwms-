import { getAllUsers } from "@/lib/supabase/server"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UserPlus, Calendar, MessageSquare, Users, ArrowRight, Sparkles } from "lucide-react"
import { UsersList } from "@/components/users/users-list"

export const revalidate = 0

export default async function UsersPage() {
  const users = await getAllUsers()

  const todayUsers =
    users?.filter((u) => {
      const today = new Date().toDateString()
      const userDate = new Date(u.created_at).toDateString()
      return today === userDate
    }).length || 0

  const activeUsers = users?.filter((u) => u.is_active).length || 0
  const totalUsers = users?.length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 max-w-7xl py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity" />
                <Image src="/logo.png" alt="o-wms" width={40} height={40} className="relative w-10 h-10" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">إدارة المستخدمين</h1>
                <p className="text-xs text-gray-500">نظام o-wms</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" size="sm" className="gap-2 text-xs h-9 rounded-xl bg-transparent">
                  <ArrowRight className="w-4 h-4" />
                  الصفحة الرئيسية
                </Button>
              </Link>
              <Link href="/users/new">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-emerald-500 to-purple-600 hover:opacity-90 text-white text-xs h-9 px-4 rounded-xl shadow-lg shadow-emerald-500/30"
                >
                  <UserPlus className="w-4 h-4 ml-2" />
                  مستخدم جديد
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 max-w-7xl py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {/* بطاقة اليوم */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
            <Card className="relative p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0 rounded-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm mb-1">تمت الإضافة اليوم</p>
                  <p className="text-4xl font-bold">{todayUsers}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Calendar className="w-7 h-7" />
                </div>
              </div>
            </Card>
          </div>

          {/* بطاقة النشطين */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
            <Card className="relative p-6 bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0 rounded-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">المستخدمين النشطين</p>
                  <p className="text-4xl font-bold">{activeUsers}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <MessageSquare className="w-7 h-7" />
                </div>
              </div>
            </Card>
          </div>

          {/* بطاقة الإجمالي */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
            <Card className="relative p-6 bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0 rounded-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm mb-1">إجمالي المستخدمين</p>
                  <p className="text-4xl font-bold">{totalUsers}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Users className="w-7 h-7" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-purple-500/10 to-blue-500/10 rounded-3xl blur-xl" />
          <Card className="relative p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-xl">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">قائمة المستخدمين</h2>
                  <p className="text-xs text-gray-500">إدارة جميع مستخدمي النظام</p>
                </div>
              </div>
              <Link href="/users/new">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-emerald-500 to-purple-600 text-white hover:opacity-90 text-xs h-9 px-4 rounded-xl"
                >
                  <Sparkles className="w-3.5 h-3.5 ml-1.5" />
                  إضافة جديد
                </Button>
              </Link>
            </div>

            {!users || users.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-full blur-2xl opacity-30 animate-pulse" />
                  <div className="relative p-6 bg-gradient-to-br from-emerald-50 to-purple-50 rounded-full">
                    <UserPlus className="w-12 h-12 text-emerald-500" />
                  </div>
                </div>
                <p className="text-gray-600 text-base font-medium mb-2">لا يوجد مستخدمين حالياً</p>
                <p className="text-gray-400 text-sm mb-6">ابدأ بإضافة أول مستخدم للنظام</p>
                <Link href="/users/new">
                  <Button className="bg-gradient-to-r from-emerald-500 to-purple-600 hover:opacity-90 text-white px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/30">
                    <UserPlus className="w-4 h-4 ml-2" />
                    إضافة أول مستخدم
                  </Button>
                </Link>
              </div>
            ) : (
              <UsersList users={users} />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
