"use client"

import type React from "react"

import { useState } from "react"
import type { UserProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, UserIcon, Phone, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import { updateUserProfile, updateUserPassword } from "@/app/actions/profile"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProfileSettingsFormProps {
  userId: string
  profile: UserProfile | null
  isAdmin?: boolean
}

export function ProfileSettingsForm({ userId, profile, isAdmin }: ProfileSettingsFormProps) {
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [profileData, setProfileData] = useState({
    fullName: profile?.full_name || "",
    phoneNumber: profile?.phone_number || "",
    email: profile?.email || "",
  })

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  })

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    console.log("[v0] Submitting profile update:", profileData)

    try {
      const formData = new FormData()
      formData.append("full_name", profileData.fullName)
      formData.append("phone_number", profileData.phoneNumber)
      formData.append("email", profileData.email)
      formData.append("user_id", userId)

      const result = await updateUserProfile(formData)

      console.log("[v0] Profile update result:", result)

      if (result.success) {
        setMessage({ type: "success", text: "تم تحديث الملف الشخصي بنجاح" })
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setMessage({ type: "error", text: result.error || "فشل تحديث الملف الشخصي" })
      }
    } catch (error: any) {
      console.error("[v0] Profile update exception:", error)
      setMessage({ type: "error", text: "حدث خطأ غير متوقع" })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMessage(null)

    console.log("[v0] Submitting password update for user:", userId)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: "error", text: "كلمات المرور غير متطابقة" })
      setPasswordLoading(false)
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" })
      setPasswordLoading(false)
      return
    }

    try {
      const result = await updateUserPassword(userId, passwordData.newPassword)

      console.log("[v0] Password update result:", result)

      if (result.success) {
        setPasswordMessage({
          type: "success",
          text: "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
        })
        setPasswordData({ newPassword: "", confirmPassword: "" })
      } else {
        setPasswordMessage({ type: "error", text: result.error || "فشل تغيير كلمة المرور" })
      }
    } catch (error: any) {
      console.error("[v0] Password update exception:", error)
      setPasswordMessage({ type: "error", text: "حدث خطأ غير متوقع" })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-pink-600" />
            المعلومات الشخصية
          </CardTitle>
          <CardDescription>قم بتحديث بياناتك الأساسية</CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-4">
              {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-gray-500" />
                الاسم الكامل
              </Label>
              <Input
                id="fullName"
                type="text"
                required
                value={profileData.fullName}
                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                placeholder="أدخل الاسم الكامل"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                رقم الجوال
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                required
                value={profileData.phoneNumber}
                onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                placeholder="966501234567"
                disabled={loading}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                placeholder="email@example.com"
                disabled={loading}
                dir="ltr"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            تغيير كلمة المرور
          </CardTitle>
          <CardDescription>قم بتحديث كلمة المرور الخاصة بك</CardDescription>
        </CardHeader>
        <CardContent>
          {passwordMessage && (
            <Alert variant={passwordMessage.type === "error" ? "destructive" : "default"} className="mb-4">
              {passwordMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{passwordMessage.text}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                required
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="••••••••"
                disabled={passwordLoading}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                disabled={passwordLoading}
                dir="ltr"
              />
            </div>

            <Button
              type="submit"
              disabled={passwordLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 ml-2" />
                  تغيير كلمة المرور
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
