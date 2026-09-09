import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SendMessageForm } from "@/components/individual/send-message-form"
import { MessagesTable } from "@/components/individual/messages-table"

export default async function IndividualMessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: messages } = await supabase
    .from("individual_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الرسائل الفردية</h1>
        <p className="text-gray-600">أرسل رسائل مخصصة إلى جهات اتصالك بشكل فردي</p>
      </div>

      <SendMessageForm userId={user.id} />
      <MessagesTable messages={messages || []} />
    </div>
  )
}
