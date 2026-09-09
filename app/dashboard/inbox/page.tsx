import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InboxMessages } from "@/components/inbox/inbox-messages"

export default async function InboxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: messages } = await supabase
    .from("incoming_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("received_at", { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">صندوق الوارد</h1>
        <p className="text-gray-600">الرسائل الواردة من جهات الاتصال الخاصة بك</p>
      </div>

      <InboxMessages messages={messages || []} userId={user.id} />
    </div>
  )
}
