"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { UserProfile } from "@/lib/types"
import { Save } from "lucide-react"

interface ProfileSettingsProps {
  profile: UserProfile | null
  userId: string
  userEmail: string
}

export function ProfileSettings({ profile, userId, userEmail }: ProfileSettingsProps) {
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
        })
        .eq("id", userId)

      if (updateError) throw updateError

      setSuccess("تم تحديث المعلومات بنجاح")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "حدث خطأ أثناء التحديث")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">المعلومات الشخصية</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="bg-green-50 text-green-900 border-green-200">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input id="email" type="email" value={userEmail} disabled dir="ltr" />
          <p className="text-xs text-gray-500">لا يمكن تغيير البريد الإلكتروني</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">الاسم الكامل</Label>
          <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">رقم الجوال</Label>
          <Input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
            dir="ltr"
          />
        </div>

        <Button type="submit" disabled={loading}>
          <Save className="ml-2 h-4 w-4" />
          {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </form>
    </Card>
  )
}
