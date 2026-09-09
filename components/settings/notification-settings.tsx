"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { UserSettings } from "@/lib/types"
import { Save } from "lucide-react"

interface NotificationSettingsProps {
  settings: UserSettings | null
  userId: string
}

export function NotificationSettings({ settings, userId }: NotificationSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState(settings?.webhook_url || "")
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(settings?.auto_reply_enabled || false)
  const [autoReplyMessage, setAutoReplyMessage] = useState(settings?.auto_reply_message || "")
  const [notificationEmail, setNotificationEmail] = useState(settings?.notification_email || "")
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
        .from("user_settings")
        .update({
          webhook_url: webhookUrl || null,
          auto_reply_enabled: autoReplyEnabled,
          auto_reply_message: autoReplyMessage || null,
          notification_email: notificationEmail || null,
        })
        .eq("user_id", userId)

      if (updateError) throw updateError

      setSuccess("تم تحديث إعدادات الإشعارات بنجاح")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "حدث خطأ أثناء التحديث")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">إعدادات الإشعارات والرد التلقائي</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
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
          <Label htmlFor="webhookUrl">رابط Webhook</Label>
          <Input
            id="webhookUrl"
            type="url"
            placeholder="https://example.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            dir="ltr"
          />
          <p className="text-xs text-gray-500">سيتم إرسال إشعارات الرسائل الواردة إلى هذا الرابط</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notificationEmail">البريد الإلكتروني للإشعارات</Label>
          <Input
            id="notificationEmail"
            type="email"
            placeholder="notifications@example.com"
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            dir="ltr"
          />
          <p className="text-xs text-gray-500">استقبل إشعارات الرسائل الواردة على بريدك الإلكتروني</p>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label htmlFor="autoReply" className="text-base">
                الرد التلقائي
              </Label>
              <p className="text-sm text-gray-500">تفعيل الرد التلقائي على الرسائل الواردة</p>
            </div>
            <Switch id="autoReply" checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
          </div>

          {autoReplyEnabled && (
            <div className="space-y-2">
              <Label htmlFor="autoReplyMessage">رسالة الرد التلقائي</Label>
              <Textarea
                id="autoReplyMessage"
                placeholder="شكراً لرسالتك. سنقوم بالرد عليك في أقرب وقت ممكن."
                value={autoReplyMessage}
                onChange={(e) => setAutoReplyMessage(e.target.value)}
                rows={4}
              />
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading}>
          <Save className="ml-2 h-4 w-4" />
          {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </form>
    </Card>
  )
}
