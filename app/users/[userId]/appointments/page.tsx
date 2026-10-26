import { AppointmentsClient } from "@/components/users/appointments-client"
import { createAdminClient } from "@/lib/supabase/admin"
import { listAppointmentMessages, listAppointmentTemplates } from "./actions"

export const dynamic = "force-dynamic"

export default async function AppointmentsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const [templates, messages, { data: profile }] = await Promise.all([
    listAppointmentTemplates(userId).catch(() => []),
    listAppointmentMessages(userId).catch(() => []),
    createAdminClient().from("user_profiles").select("account_status, account_active_until").eq("id", userId).single(),
  ])
  const expired = profile?.account_active_until && new Date(profile.account_active_until) < new Date()
  const canSend = profile?.account_status === "active" && !expired

  return (
    <AppointmentsClient
      userId={userId}
      canSend={!!canSend}
      initialTemplates={templates.map((t) => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() }))}
      initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
    />
  )
}
