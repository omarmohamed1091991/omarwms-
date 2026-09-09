import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

interface RecentMessagesProps {
  userId: string
}

export async function RecentMessages({ userId }: RecentMessagesProps) {
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from("individual_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)

  if (!messages || messages.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">لا توجد رسائل بعد</p>
          <p className="text-sm">ابدأ بإرسال رسائلك الأولى من قائمة الرسائل الفردية</p>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">الرسائل الأخيرة</h2>
      <Card className="divide-y">
        {messages.map((message) => (
          <div key={message.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="font-medium text-gray-900 mb-1">{message.recipient_phone}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{message.message_text}</p>
              </div>
              <Badge
                variant={
                  message.status === "sent" ? "default" : message.status === "failed" ? "destructive" : "secondary"
                }
              >
                {message.status === "sent" ? "مرسلة" : message.status === "failed" ? "فشلت" : "قيد الإرسال"}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(message.created_at), {
                addSuffix: true,
                locale: ar,
              })}
            </p>
          </div>
        ))}
      </Card>
    </div>
  )
}
