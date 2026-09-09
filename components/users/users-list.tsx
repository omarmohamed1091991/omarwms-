"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Trash2, Phone, Search, Settings, Calendar, Shield, User, Sparkles } from "lucide-react"
import { deleteUser, updateUserRole } from "@/app/actions/users"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserInterface {
  id: string
  full_name: string | null
  phone_number: string
  whatsapp_instance_id: string | null
  whatsapp_token: string | null
  is_active: boolean
  created_at: string
  role: "admin" | "user"
  email: string | null
}

const cardGradients = [
  "from-rose-500 via-pink-500 to-fuchsia-500",
  "from-violet-500 via-purple-500 to-indigo-500",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-emerald-500 via-green-500 to-lime-500",
  "from-amber-500 via-orange-500 to-red-500",
  "from-indigo-500 via-blue-500 to-cyan-500",
  "from-fuchsia-500 via-pink-500 to-rose-500",
  "from-teal-500 via-emerald-500 to-green-500",
]

export function UsersList({ users }: { users: UserInterface[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || user.phone_number.includes(searchTerm),
  )

  async function handleDelete(userId: string, e: React.MouseEvent) {
    e.stopPropagation()

    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع بياناته.")) {
      return
    }

    setDeleting(userId)
    const result = await deleteUser(userId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || "حدث خطأ أثناء حذف المستخدم")
    }
    setDeleting(null)
  }

  async function handleRoleChange(userId: string, newRole: "admin" | "user") {
    setUpdatingRole(userId)
    const result = await updateUserRole(userId, newRole)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || "حدث خطأ أثناء تحديث الصلاحيات")
    }
    setUpdatingRole(null)
  }

  function handleCardClick(userId: string) {
    router.push(`/users/${userId}`)
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-xl blur-lg" />
        <div className="relative flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white/50 shadow-md">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg">
            <Search className="w-4 h-4 text-white" />
          </div>
          <Input
            type="text"
            placeholder="ابحث عن مستخدم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm bg-transparent placeholder:text-gray-400 h-8"
          />
          <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 px-3 py-1 text-xs">
            {filteredUsers.length} مستخدم
          </Badge>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white">
                <User className="w-8 h-8" />
              </div>
            </div>
            <p className="text-base font-bold text-gray-700 mb-1">لا يوجد مستخدمين</p>
            <p className="text-sm text-gray-500 mb-4">ابدأ بإضافة مستخدم جديد للنظام</p>
            <Link href="/users/new">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 transition-opacity px-6 py-2 rounded-lg shadow-lg shadow-pink-500/30 text-sm">
                <Sparkles className="w-4 h-4 ml-2" />
                إضافة مستخدم جديد
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredUsers.map((user, index) => {
            const gradientIndex = index % cardGradients.length
            const gradient = cardGradients[gradientIndex]

            return (
              <div
                key={user.id}
                className="group relative cursor-pointer"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: "fadeInUp 0.4s ease-out forwards",
                  opacity: 0,
                }}
                onClick={() => handleCardClick(user.id)}
              >
                <div
                  className={`absolute -inset-0.5 bg-gradient-to-r ${gradient} rounded-2xl blur opacity-0 group-hover:opacity-50 transition-all duration-300`}
                />

                <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white rounded-xl">
                  <div className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-br ${gradient} opacity-90`}>
                    <div className="absolute top-2 left-2 w-10 h-10 bg-white/10 rounded-full blur-lg" />
                    <div className="absolute bottom-0 right-2 w-8 h-8 bg-white/10 rounded-full blur-md" />
                  </div>

                  <CardContent className="relative pt-4 pb-3 px-3">
                    <div className="flex justify-center mb-2">
                      <div className="relative">
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-full blur-sm opacity-40 group-hover:opacity-60 transition-opacity`}
                        />
                        <div className="relative w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-white group-hover:scale-105 transition-transform duration-200">
                          <span
                            className={`text-lg font-bold bg-gradient-to-br ${gradient} bg-clip-text text-transparent`}
                          >
                            {user.full_name?.charAt(0) || user.phone_number.charAt(0)}
                          </span>
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white shadow flex items-center justify-center ${user.is_active ? "bg-green-500" : "bg-gray-400"}`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full bg-white ${user.is_active ? "animate-pulse" : ""}`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-center mb-2">
                      <h3 className="text-sm font-bold text-gray-900 mb-1 truncate">{user.full_name || "بدون اسم"}</h3>
                      <div className="flex justify-center gap-1 flex-wrap">
                        <Badge
                          className={`px-2 py-0.5 text-[10px] font-medium border-0 ${
                            user.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {user.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                        <Badge
                          className={`px-2 py-0.5 text-[10px] font-medium border-0 ${
                            user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {user.role === "admin" ? "أدمن" : "مستخدم"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-2">
                      <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg group-hover:bg-gray-100/80 transition-colors">
                        <Phone className="w-3 h-3 text-pink-500" />
                        <span className="text-[11px] font-mono text-gray-600 truncate">{user.phone_number}</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg group-hover:bg-gray-100/80 transition-colors">
                        <Calendar className="w-3 h-3 text-purple-500" />
                        <span className="text-[11px] text-gray-600">
                          {new Date(user.created_at).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                    </div>

                    <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value as "admin" | "user")}
                        disabled={updatingRole === user.id}
                      >
                        <SelectTrigger className="h-7 text-[11px] rounded-lg border-gray-200 focus:border-purple-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user" className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-blue-500" />
                              مستخدم
                            </div>
                          </SelectItem>
                          <SelectItem value="admin" className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3 h-3 text-purple-500" />
                              أدمن
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <Link href={`/users/${user.id}/profile`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-[11px] gap-1 bg-transparent"
                        >
                          <Settings className="w-3 h-3 text-purple-500" />
                          الإعدادات
                        </Button>
                      </Link>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 left-2 w-6 h-6 p-0 rounded-full bg-white/30 hover:bg-red-500 text-white hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      onClick={(e) => handleDelete(user.id, e)}
                      disabled={deleting === user.id}
                    >
                      {deleting === user.id ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
