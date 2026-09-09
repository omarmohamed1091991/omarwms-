"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { UserProfile } from "@/lib/types"
import { LinkIcon } from "lucide-react"

interface WhatsAppSettingsProps {
  profile: UserProfile | null
  userId: string
}

export function WhatsAppSettings({ profile, userId }: WhatsAppSettingsProps) {
  const [instanceId, setInstanceId] = useState(profile?.whatsapp_instance_id || "")
  const [token, setToken] = useState(profile?.whatsapp_token || "")
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
          whatsapp_instance_id: instanceId,
          whatsapp_token: token,
        })
        .eq("id", userId)

      if (updateError) throw updateError

      setSuccess("تم تحديث إعدادات واتساب بنجاح")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "حدث خطأ أثناء التحديث")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">إعدادات واتساب API</h2>
        {profile?.is_active ? (
          <Badge variant="default" className="bg-green-600">
            متصل
          </Badge>
        ) : (
          <Badge variant="secondary">غير متصل</Badge>
        )}
      </div>

      <Alert className="mb-4">
        <AlertDescription>
          قم بربط حسابك مع WhatsApp Business API للبدء في إرسال واستقبال الرسائل. يمكنك استخدام خدمات مثل WhatsApp
          Business API أو أي مزود خدمة متوافق.
        </AlertDescription>
      </Alert>

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
          <Label htmlFor="instanceId">معرف النسخة (Instance ID)</Label>
          <Input
            id="instanceId"
            type="text"
            placeholder="أدخل معرف النسخة الخاص بك"
            value={instanceId}
            onChange={(e) => setInstanceId(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">الرمز المميز (Token)</Label>
          <Input
            id="token"
            type="password"
            placeholder="أدخل الرمز المميز الخاص بك"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            dir="ltr"
          />
        </div>

        <Button type="submit" disabled={loading}>
          <LinkIcon className="ml-2 h-4 w-4" />
          {loading ? "جاري الربط..." : "ربط الحساب"}
        </Button>
      </form>
    </Card>
  )
}
