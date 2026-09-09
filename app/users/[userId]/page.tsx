import { createAdminClient } from "@/lib/supabase/admin"
import UserDashboardClient from "@/components/users/user-dashboard-client"

export const revalidate = 0

async function fetchAllRecords(supabase: any, table: string, column: string, value: string, orderBy?: string) {
  const allRecords: any[] = []
  let offset = 0
  const limit = 1000

  while (true) {
    let query = supabase
      .from(table)
      .select("*")
      .eq(column, value)
      .range(offset, offset + limit - 1)

    if (orderBy) {
      query = query.order(orderBy, { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error(`Error fetching from ${table}:`, error)
      break
    }

    if (!data || data.length === 0) {
      break
    }

    allRecords.push(...data)

    if (data.length < limit) {
      break
    }

    offset += limit
  }

  return allRecords
}

async function fetchAllBulkRecipients(supabase: any, bulkMessageIds: string[]) {
  if (bulkMessageIds.length === 0) return []

  const allRecords: any[] = []
  const batchSize = 50

  for (let i = 0; i < bulkMessageIds.length; i += batchSize) {
    const batchIds = bulkMessageIds.slice(i, i + batchSize)
    let offset = 0
    const limit = 1000

    while (true) {
      const { data, error } = await supabase
        .from("bulk_message_recipients")
        .select("*")
        .in("bulk_message_id", batchIds)
        .range(offset, offset + limit - 1)

      if (error) {
        console.error("Error fetching bulk_message_recipients:", error)
        break
      }

      if (!data || data.length === 0) {
        break
      }

      allRecords.push(...data)

      if (data.length < limit) {
        break
      }

      offset += limit
    }
  }

  return allRecords
}

export default async function UserDashboard({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = createAdminClient()

  const [individualMessages, bulkMessages, incomingMessages] = await Promise.all([
    fetchAllRecords(supabase, "individual_messages", "user_id", userId, "created_at"),
    fetchAllRecords(supabase, "bulk_messages", "user_id", userId, "created_at"),
    fetchAllRecords(supabase, "incoming_messages", "user_id", userId, "received_at"),
  ])

  const bulkMessageIds = bulkMessages.map((m: any) => m.id) || []
  const bulkRecipientsData = await fetchAllBulkRecipients(supabase, bulkMessageIds)

  return (
    <UserDashboardClient
      individualMessages={individualMessages || []}
      bulkMessages={bulkMessages || []}
      bulkRecipientsData={bulkRecipientsData || []}
      incomingMessages={incomingMessages || []}
    />
  )
}
