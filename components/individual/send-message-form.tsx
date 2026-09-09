"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"

interface SendMessageFormProps {
  userId: string
}

export function SendMessageForm({ userId }: SendMessageFormProps) {
  const [recipientPhone, setRecipientPhone] = useState("")
  const [messageText, setMessageText] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      if (!recipientPhone || !messageText) {
        throw new Error("رقم الجوال والرسالة مطلوبان")
      }

      const supabase = createClient()
      const result = await supabase.from("individual_messages").insert({
        user_id: userId,
        recipient_phone: recipientPhone,
        message_text: messageText,
        media_url: mediaUrl || null,
        status: "pending",
      })

      if (result.error) {
        throw result.error
      }

      setSuccess("تم إرسال الرسالة بنجاح")
      setRecipientPhone("")
      setMessageText("")
      setMediaUrl("")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إرسال الرسالة")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">إرسال رسالة جديدة</h2>
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

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipientPhone">رقم جوال المستلم</Label>
            <Input
              id="recipientPhone"
              type="tel"
              placeholder="+966XXXXXXXXX"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              required
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mediaUrl">رابط الوسائط (اختياري)</Label>
            <Input
              id="mediaUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="messageText">نص الرسالة</Label>
          <Textarea
            id="messageText"
            placeholder="اكتب رسالتك هنا..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            required
            rows={5}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          <Send className="ml-2 h-4 w-4" />
          {loading ? "جاري الإرسال..." : "إرسال الرسالة"}
        </Button>
      </form>
    </Card>
  )
}
