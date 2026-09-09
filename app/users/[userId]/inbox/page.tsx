import { InboxClient } from "@/components/users/inbox-client"
import { createAdminClient } from "@/lib/supabase/admin"

export const revalidate = 0

interface InboxPageProps {
  params: {
    userId: string
  }
}

async function getInitialMessages(userId: string) {
  const supabase = createAdminClient()

  const allMessages: any[] = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data: messages, error } = await supabase
      .from("incoming_messages")
      .select("*")
      .eq("user_id", userId)
      .order("received_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error("Error fetching messages page:", page, error)
      break
    }

    if (messages && messages.length > 0) {
      allMessages.push(...messages)
    }

    // استمر في جلب الصفحات حتى لا توجد بيانات
    hasMore = messages && messages.length === pageSize
    page++
  }

  // عكس الترتيب ليكون من الأقدم للأحدث
  allMessages.reverse()

  return allMessages
}

export default async function InboxPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  const initialMessages = await getInitialMessages(userId)

  return <InboxClient userId={userId} initialMessages={initialMessages} />
}
