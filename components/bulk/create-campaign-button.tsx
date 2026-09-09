"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

interface CreateCampaignButtonProps {
  userId: string
}

export function CreateCampaignButton({ userId }: CreateCampaignButtonProps) {
  const [open, setOpen] = useState(false)
  const [campaignName, setCampaignName] = useState("")
  const [messageText, setMessageText] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [recipients, setRecipients] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!campaignName || !messageText || !recipients) {
        throw new Error("جميع الحقول مطلوبة")
      }

      // تحويل الأرقام إلى مصفوفة
      const phoneNumbers = recipients
        .split("\n")
        .map((num) => num.trim())
        .filter((num) => num.length > 0)

      if (phoneNumbers.length === 0) {
        throw new Error("يجب إضافة رقم واحد على الأقل")
      }

      // إنشاء الحملة
      const { data: campaign, error: campaignError } = await supabase
        .from("bulk_messages")
        .insert({
          user_id: userId,
          campaign_name: campaignName,
          message_text: messageText,
          media_url: mediaUrl || null,
          total_recipients: phoneNumbers.length,
          status: "draft",
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // إضافة المستلمين
      const recipientsData = phoneNumbers.map((phone) => ({
        bulk_message_id: campaign.id,
        recipient_phone: phone,
        status: "pending",
      }))

      const { error: recipientsError } = await supabase.from("bulk_message_recipients").insert(recipientsData)

      if (recipientsError) throw recipientsError

      setOpen(false)
      setCampaignName("")
      setMessageText("")
      setMediaUrl("")
      setRecipients("")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "حدث خطأ أثناء إنشاء الحملة")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          إنشاء حملة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إنشاء حملة رسائل جماعية</DialogTitle>
          <DialogDescription>أنشئ حملة جديدة لإرسال رسائل لمجموعة من المستلمين</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="campaignName">اسم الحملة</Label>
            <Input
              id="campaignName"
              placeholder="مثال: حملة عروض رمضان"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              required
            />
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

          <div className="space-y-2">
            <Label htmlFor="recipients">أرقام المستلمين (رقم في كل سطر)</Label>
            <Textarea
              id="recipients"
              placeholder="+966XXXXXXXXX&#10;+966YYYYYYYYY&#10;+966ZZZZZZZZZ"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              required
              rows={8}
              dir="ltr"
            />
            <p className="text-xs text-gray-500">أدخل رقم جوال واحد في كل سطر</p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الإنشاء..." : "إنشاء الحملة"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
