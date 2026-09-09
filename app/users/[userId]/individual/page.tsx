import { createAdminClient } from "@/lib/supabase/admin"
import { IndividualMessagesClient } from "@/components/users/individual-messages-client"

export const revalidate = 0

export default async function IndividualMessagesPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = createAdminClient()

  const { data: messages } = await supabase
    .from("individual_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return <IndividualMessagesClient userId={userId} initialMessages={messages || []} />
}
