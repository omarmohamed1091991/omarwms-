import { createAdminClient } from "@/lib/supabase/admin"
import { IndividualMessagesClient } from "@/components/users/individual-messages-client"

export const revalidate = 0

export default async function IndividualMessagesPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = createAdminClient()

  const [{ data: messages }, { data: profile }] = await Promise.all([
    supabase
      .from("individual_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("user_profiles").select("account_status, is_active, account_active_until").eq("id", userId).single(),
  ])

  return (
    <IndividualMessagesClient
      userId={userId}
      initialMessages={messages || []}
      accountStatus={profile?.account_status === "active" && profile?.account_active_until && new Date(profile.account_active_until) < new Date() ? "suspended" : profile?.account_status || (profile?.is_active ? "active" : "suspended")}
    />
  )
}
