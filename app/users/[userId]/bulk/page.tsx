import { createAdminClient } from "@/lib/supabase/admin"
import BulkMessagesClient from "@/components/users/bulk-messages-client"

export const revalidate = 0

export default async function BulkMessagesPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("account_status, is_active")
    .eq("id", userId)
    .single()
  const accountStatus = profile?.account_status || (profile?.is_active ? "active" : "suspended")

  return <BulkMessagesClient userId={userId} accountStatus={accountStatus} />
}
