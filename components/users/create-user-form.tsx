"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUser } from "@/app/actions/users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Loader2, UserPlus, Phone, User, Key, Mail, Lock } from "lucide-react"

export default function CreateUserForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
    whatsappInstanceId: "",
    whatsappToken: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formDataObj = new FormData()
      formDataObj.append("full_name", formData.fullName)
      formDataObj.append("phone_number", formData.phoneNumber)
      formDataObj.append("email", formData.email)
      formDataObj.append("password", formData.password)
      if (formData.whatsappInstanceId) {
        formDataObj.append("whatsapp_instance_id", formData.whatsappInstanceId)
      }
      if (formData.whatsappToken) {
        formDataObj.append("whatsapp_token", formData.whatsappToken)
      }

      console.log("[v0] Creating user with data:", {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
      })

      const result = await createUser(formDataObj)

      if (result.success) {
        console.log("[v0] User created successfully")
        setSuccess(true)
        setTimeout(() => {
          window.location.href = "/users"
        }, 1000)
      } else {
        console.error("[v0] User creation failed:", result.error)
        setError(result.error || "حدث خطأ أثناء إنشاء المستخدم")
        setLoading(false)
      }
    } catch (err: any) {
      console.error("[v0] Exception during user creation:", err)
      setError(err.message || "حدث خطأ غير متوقع")
      setLoading(false)
    }
  }

  return (
    <Card className="p-5 shadow-md bg-white border">
      <div className="mb-5">
        <h2 className="text-base font-bold bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent mb-1">
          إضافة مستخدم جديد
        </h2>
        <p className="text-xs text-gray-600">قم بملء البيانات لإنشاء حساب مستخدم جديد في النظام</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-3 py-2.5 rounded-lg mb-4 animate-in slide-in-from-top">
          <p className="font-semibold text-xs">خطأ</p>
          <p className="text-xs">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-3 py-2.5 rounded-lg mb-4 animate-in slide-in-from-top">
          <p className="font-semibold text-xs">نجح!</p>
          <p className="text-xs">تم إنشاء المستخدم بنجاح! جاري التحويل...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName" className="flex items-center gap-1.5 mb-1.5 text-gray-700 font-semibold text-xs">
            <User className="w-3.5 h-3.5 text-emerald-500" />
            الاسم الكامل
          </Label>
          <Input
            id="fullName"
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="أدخل الاسم الكامل"
            className="text-xs h-9 border focus:border-emerald-500 transition-colors"
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="phoneNumber" className="flex items-center gap-1.5 mb-1.5 text-gray-700 font-semibold text-xs">
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
            رقم الجوال (WhatsApp)
          </Label>
          <Input
            id="phoneNumber"
            type="tel"
            required
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="مثال: 966501234567"
            className="text-xs h-9 border focus:border-emerald-500 transition-colors"
            dir="ltr"
            disabled={loading}
          />
          <p className="text-[10px] text-gray-500 mt-1">الرقم مع كود الدولة بدون علامة +</p>
        </div>

        <div>
          <Label htmlFor="email" className="flex items-center gap-1.5 mb-1.5 text-gray-700 font-semibold text-xs">
            <Mail className="w-3.5 h-3.5 text-emerald-500" />
            البريد الإلكتروني
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
            className="text-xs h-9 border focus:border-emerald-500 transition-colors"
            dir="ltr"
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="password" className="flex items-center gap-1.5 mb-1.5 text-gray-700 font-semibold text-xs">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            كلمة المرور
          </Label>
          <Input
            id="password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="أدخل كلمة المرور (8 أحرف على الأقل)"
            className="text-xs h-9 border focus:border-emerald-500 transition-colors"
            dir="ltr"
            disabled={loading}
            minLength={8}
          />
          <p className="text-[10px] text-gray-500 mt-1">كلمة المرور يجب أن تكون 8 أحرف على الأقل</p>
        </div>

        <div>
          <Label
            htmlFor="whatsappInstanceId"
            className="flex items-center gap-1.5 mb-1.5 text-gray-700 font-semibold text-xs"
          >
            <Key className="w-3.5 h-3.5 text-blue-600" />
            WhatsApp Instance ID (اختياري)
          </Label>
          <Input
            id="whatsappInstanceId"
            type="text"
            value={formData.whatsappInstanceId}
            onChange={(e) => setFormData({ ...formData, whatsappInstanceId: e.target.value })}
            placeholder="أدخل Instance ID إن وجد"
            className="text-xs h-9 border focus:border-blue-600 transition-colors"
            dir="ltr"
            disabled={loading}
          />
        </div>

        <div>
          <Label
            htmlFor="whatsappToken"
            className="flex items-center gap-1.5 mb-1.5 text-gray-700 font-semibold text-xs"
          >
            <Key className="w-3.5 h-3.5 text-blue-600" />
            WhatsApp API Token (اختياري)
          </Label>
          <Input
            id="whatsappToken"
            type="text"
            value={formData.whatsappToken}
            onChange={(e) => setFormData({ ...formData, whatsappToken: e.target.value })}
            placeholder="أدخل API Token إن وجد"
            className="text-xs h-9 border focus:border-blue-600 transition-colors"
            dir="ltr"
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white text-xs h-9 gap-1.5 shadow-md hover:shadow-lg transition-all font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              جاري الإنشاء...
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" />
              إنشاء المستخدم
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}
