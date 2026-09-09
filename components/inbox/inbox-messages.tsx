"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { IncomingMessage } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { Mail, MailOpen, Trash2, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface InboxMessagesProps {
  messages: IncomingMessage[]
  userId: string
}

export function InboxMessages({ messages, userId }: InboxMessagesProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleMarkAsRead = async (messageId: string, currentStatus: boolean) => {
    setUpdating(messageId)
    try {
      const { error } = await supabase.from("incoming_messages").update({ is_read: !currentStatus }).eq("id", messageId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error updating message:", error)
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return

    setDeleting(messageId)
    try {
      const { error } = await supabase.from("incoming_messages").delete().eq("id", messageId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error deleting message:", error)
    } finally {
      setDeleting(null)
    }
  }

  if (messages.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500">
          <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg mb-2">لا توجد رسائل واردة</p>
          <p className="text-sm">ستظهر هنا الرسائل الواردة من جهات الاتصال</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card
          key={message.id}
          className={`p-6 transition-colors ${!message.is_read ? "bg-blue-50 border-blue-200" : ""}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {!message.is_read && (
                  <Badge variant="default" className="bg-blue-600">
                    جديد
                  </Badge>
                )}
                <h3 className="font-bold text-lg text-gray-900">{message.sender_phone}</h3>
              </div>

              {message.message_text && <p className="text-gray-700 mb-3 whitespace-pre-wrap">{message.message_text}</p>}

              {message.media_url && (
                <a
                  href={message.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1 mb-3"
                >
                  <ExternalLink className="h-4 w-4" />
                  عرض الوسائط المرفقة
                </a>
              )}

              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(message.received_at), {
                  addSuffix: true,
                  locale: ar,
                })}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAsRead(message.id, message.is_read)}
                disabled={updating === message.id}
                title={message.is_read ? "تعليم كغير مقروء" : "تعليم كمقروء"}
              >
                {message.is_read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(message.id)}
                disabled={deleting === message.id}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
