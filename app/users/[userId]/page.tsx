import { createAdminClient } from "@/lib/supabase/admin"
import UserDashboardClient from "@/components/users/user-dashboard-client"
import { getMessagingLimit } from "@/lib/messaging-limit"

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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "account_status, is_active, account_active_until, subscription_expires_at, subscription_price_cents, whatsapp_access_token, whatsapp_phone_number_id, whatsapp_business_account_id",
    )
    .eq("id", userId)
    .single()

  // حد الإرسال الفعلي من Meta (يتم الجلب على الخادم فقط حتى لا يصل رمز الوصول إلى المتصفح)
  const messagingLimit = await getMessagingLimit({
    accessToken: profile?.whatsapp_access_token || null,
    phoneNumberId: profile?.whatsapp_phone_number_id ? String(profile.whatsapp_phone_number_id) : null,
    wabaId: profile?.whatsapp_business_account_id ? String(profile.whatsapp_business_account_id) : null,
  })

  // تحتسب Meta الحد بعدد العملاء الفريدين الذين استلموا رسائل قوالب (محادثات يبدأها النشاط) خلال آخر 24 ساعة
  const since24h = Date.now() - 24 * 60 * 60 * 1000
  const uniqueRecipients24h = new Set(
    individualMessages
      .filter(
        (m: any) =>
          m.message_type === "template" &&
          ["sent", "delivered", "read"].includes(m.status) &&
          new Date(m.sent_at || m.created_at).getTime() >= since24h,
      )
      .map((m: any) => String(m.recipient_phone || "").replace(/\D/g, ""))
      .filter(Boolean),
  ).size

  return (
    <UserDashboardClient
      accountStatus={profile?.account_status === "active" && profile?.account_active_until && new Date(profile.account_active_until) < new Date() ? "suspended" : profile?.account_status || (profile?.is_active ? "active" : "suspended")}
      accountActiveUntil={profile?.account_active_until || null}
      subscriptionExpiresAt={profile?.subscription_expires_at || null}
      subscriptionPriceCents={profile?.subscription_price_cents || 0}
      userId={userId}
      messagingLimit={messagingLimit}
      uniqueRecipients24h={uniqueRecipients24h}
      individualMessages={individualMessages || []}
      bulkMessages={bulkMessages || []}
      bulkRecipientsData={bulkRecipientsData || []}
      incomingMessages={incomingMessages || []}
    />
  )
}
