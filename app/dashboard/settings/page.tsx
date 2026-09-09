import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { WhatsAppSettings } from "@/components/settings/whatsapp-settings"
import { NotificationSettings } from "@/components/settings/notification-settings"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

  const { data: settings } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الإعدادات</h1>
        <p className="text-gray-600">إدارة معلومات حسابك وإعدادات واتساب الخاصة بك</p>
      </div>

      <ProfileSettings profile={profile} userId={user.id} userEmail={user.email || ""} />
      <WhatsAppSettings profile={profile} userId={user.id} />
      <NotificationSettings settings={settings} userId={user.id} />
    </div>
  )
}
