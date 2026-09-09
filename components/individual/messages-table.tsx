"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { IndividualMessage } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { Trash2, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface MessagesTableProps {
  messages: IndividualMessage[]
}

export function MessagesTable({ messages }: MessagesTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (messageId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return

    setDeleting(messageId)
    try {
      const { error } = await supabase.from("individual_messages").delete().eq("id", messageId)

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
          <p className="text-lg mb-2">لا توجد رسائل فردية بعد</p>
          <p className="text-sm">ابدأ بإرسال رسالتك الأولى من النموذج أعلاه</p>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">سجل الرسائل</h2>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">رقم المستلم</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الرسالة</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الحالة</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">التاريخ</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {messages.map((message) => (
                <tr key={message.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{message.recipient_phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="max-w-md">
                      <p className="line-clamp-2">{message.message_text}</p>
                      {message.media_url && (
                        <a
                          href={message.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs flex items-center gap-1 mt-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          عرض الوسائط
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Badge
                      variant={
                        message.status === "sent"
                          ? "default"
                          : message.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {message.status === "sent" ? "مرسلة" : message.status === "failed" ? "فشلت" : "قيد الإرسال"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: ar,
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(message.id)}
                      disabled={deleting === message.id}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
