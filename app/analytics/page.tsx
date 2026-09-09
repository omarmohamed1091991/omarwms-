import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { AnalyticsClient } from "@/components/analytics/analytics-client"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // التحقق من صلاحية الأدمن
  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  const adminClient = createAdminClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // جلب جميع المستخدمين باستخدام Admin Client
  const { data: users } = await adminClient
    .from("user_profiles")
    .select("id, full_name, phone_number, email, is_active, created_at")
    .order("created_at", { ascending: false })

  // جلب جميع البيانات دفعة واحدة بدلاً من طلب لكل مستخدم

  // جلب جميع الرسائل الفردية
  const { data: allIndividualMessages } = await adminClient
    .from("individual_messages")
    .select("id, user_id, status, created_at, sent_at")

  // تأخير قصير بين الطلبات
  await new Promise((resolve) => setTimeout(resolve, 100))

  // جلب جميع الرسائل الجماعية
  const { data: allBulkMessages } = await adminClient
    .from("bulk_messages")
    .select("id, user_id, total_recipients, sent_count, failed_count, created_at")

  await new Promise((resolve) => setTimeout(resolve, 100))

  // جلب جميع مستلمي الرسائل الجماعية
  const { data: allBulkRecipients } = await adminClient
    .from("bulk_message_recipients")
    .select("id, status, created_at, sent_at, bulk_message_id")

  await new Promise((resolve) => setTimeout(resolve, 100))

  // جلب جميع الرسائل الواردة
  const { data: allIncomingMessages } = await adminClient
    .from("incoming_messages")
    .select("id, user_id, is_read, received_at")

  // إنشاء خريطة لربط bulk_message_id بـ user_id
  const bulkMessageUserMap = new Map<string, string>()
  ;(allBulkMessages || []).forEach((bm) => {
    bulkMessageUserMap.set(bm.id, bm.user_id)
  })

  // تجميع البيانات حسب user_id
  const individualByUser = new Map<string, any[]>()
  ;(allIndividualMessages || []).forEach((msg) => {
    const userId = msg.user_id
    if (!individualByUser.has(userId)) {
      individualByUser.set(userId, [])
    }
    individualByUser.get(userId)!.push(msg)
  })

  const bulkRecipientsByUser = new Map<string, any[]>()
  ;(allBulkRecipients || []).forEach((recipient) => {
    const userId = bulkMessageUserMap.get(recipient.bulk_message_id)
    if (userId) {
      if (!bulkRecipientsByUser.has(userId)) {
        bulkRecipientsByUser.set(userId, [])
      }
      bulkRecipientsByUser.get(userId)!.push(recipient)
    }
  })

  const incomingByUser = new Map<string, any[]>()
  ;(allIncomingMessages || []).forEach((msg) => {
    const userId = msg.user_id
    if (!incomingByUser.has(userId)) {
      incomingByUser.set(userId, [])
    }
    incomingByUser.get(userId)!.push(msg)
  })

  // حساب إحصائيات كل مستخدم
  const usersWithStats = (users || []).map((userData) => {
    const individualMessages = individualByUser.get(userData.id) || []
    const bulkRecipients = bulkRecipientsByUser.get(userData.id) || []
    const incomingMessages = incomingByUser.get(userData.id) || []

    const calculatePeriodStats = (startDate: string) => {
      const periodIndividual = individualMessages.filter(
        (m) => (m.sent_at && m.sent_at >= startDate) || (m.created_at && m.created_at >= startDate),
      )
      const periodBulk = bulkRecipients.filter(
        (r) => (r.sent_at && r.sent_at >= startDate) || (r.created_at && r.created_at >= startDate),
      )
      const periodIncoming = incomingMessages.filter((m) => m.received_at >= startDate)

      const totalAttempted = periodIndividual.length + periodBulk.length
      const successful =
        periodIndividual.filter((m) => m.status === "sent" || m.status === "delivered").length +
        periodBulk.filter((r) => r.status === "sent" || r.status === "delivered").length
      const failed =
        periodIndividual.filter((m) => m.status === "failed").length +
        periodBulk.filter((r) => r.status === "failed").length

      return {
        totalAttempted,
        successful,
        failed,
        incoming: periodIncoming.length,
        successRate: totalAttempted > 0 ? ((successful / totalAttempted) * 100).toFixed(1) : "0.0",
      }
    }

    // حساب الإحصائيات لجميع الفترات
    const todayStats = calculatePeriodStats(todayStart)
    const weekStats = calculatePeriodStats(weekStart)
    const monthStats = calculatePeriodStats(monthStart)

    // إحصائيات كاملة
    const totalIndividualAttempted = individualMessages.length
    const totalBulkRecipients = bulkRecipients.length
    const totalAttempted = totalIndividualAttempted + totalBulkRecipients

    const successfulIndividual = individualMessages.filter(
      (m) => m.status === "sent" || m.status === "delivered",
    ).length
    const successfulBulk = bulkRecipients.filter((r) => r.status === "sent" || r.status === "delivered").length
    const totalSuccessful = successfulIndividual + successfulBulk

    const failedIndividual = individualMessages.filter((m) => m.status === "failed").length
    const failedBulk = bulkRecipients.filter((r) => r.status === "failed").length
    const totalFailed = failedIndividual + failedBulk

    const totalIncoming = incomingMessages.length
    const unreadIncoming = incomingMessages.filter((m) => !m.is_read).length

    const successRate = totalAttempted > 0 ? ((totalSuccessful / totalAttempted) * 100).toFixed(1) : "0.0"

    return {
      ...userData,
      stats: {
        totalSent: totalAttempted,
        totalSuccessful,
        totalFailed,
        totalIncoming,
        unreadIncoming,
        successRate,
        individualMessages: totalIndividualAttempted,
        bulkMessages: totalBulkRecipients,
        today: {
          totalSent: todayStats.totalAttempted,
          successful: todayStats.successful,
          failed: todayStats.failed,
          incoming: todayStats.incoming,
          successRate: todayStats.successRate,
        },
        week: {
          totalSent: weekStats.totalAttempted,
          successful: weekStats.successful,
          failed: weekStats.failed,
          incoming: weekStats.incoming,
          successRate: weekStats.successRate,
        },
        month: {
          totalSent: monthStats.totalAttempted,
          successful: monthStats.successful,
          failed: monthStats.failed,
          incoming: monthStats.incoming,
          successRate: monthStats.successRate,
        },
        rawData: {
          individualMessages,
          bulkRecipients,
          incomingMessages,
        },
      },
    }
  })

  // حساب الإحصائيات الإجمالية مع الفترات الزمنية
  const totalStats = usersWithStats.reduce(
    (acc, userData) => ({
      totalSent: acc.totalSent + userData.stats.totalSent,
      totalSuccessful: acc.totalSuccessful + userData.stats.totalSuccessful,
      totalFailed: acc.totalFailed + userData.stats.totalFailed,
      totalIncoming: acc.totalIncoming + userData.stats.totalIncoming,
      unreadIncoming: acc.unreadIncoming + userData.stats.unreadIncoming,
      today: {
        totalSent: acc.today.totalSent + userData.stats.today.totalSent,
        successful: acc.today.successful + userData.stats.today.successful,
        failed: acc.today.failed + userData.stats.today.failed,
        incoming: acc.today.incoming + userData.stats.today.incoming,
      },
      week: {
        totalSent: acc.week.totalSent + userData.stats.week.totalSent,
        successful: acc.week.successful + userData.stats.week.successful,
        failed: acc.week.failed + userData.stats.week.failed,
        incoming: acc.week.incoming + userData.stats.week.incoming,
      },
      month: {
        totalSent: acc.month.totalSent + userData.stats.month.totalSent,
        successful: acc.month.successful + userData.stats.month.successful,
        failed: acc.month.failed + userData.stats.month.failed,
        incoming: acc.month.incoming + userData.stats.month.incoming,
      },
    }),
    {
      totalSent: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      totalIncoming: 0,
      unreadIncoming: 0,
      today: { totalSent: 0, successful: 0, failed: 0, incoming: 0 },
      week: { totalSent: 0, successful: 0, failed: 0, incoming: 0 },
      month: { totalSent: 0, successful: 0, failed: 0, incoming: 0 },
    },
  )

  const overallSuccessRate =
    totalStats.totalSent > 0 ? ((totalStats.totalSuccessful / totalStats.totalSent) * 100).toFixed(1) : "0.0"

  return (
    <AnalyticsClient
      users={usersWithStats}
      totalStats={{
        ...totalStats,
        successRate: overallSuccessRate,
        totalUsers: usersWithStats.length,
        activeUsers: usersWithStats.filter((u) => u.is_active).length,
      }}
    />
  )
}
