import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إعدادات الملف الشخصي</h1>
        <p className="text-sm text-gray-600 mt-1">قم بتحديث معلومات حسابك الشخصية</p>
      </div>

      <ProfileSettingsForm user={user} profile={profile} />
    </div>
  )
}
