import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form"

export default async function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: currentUserProfile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

  if (currentUserProfile?.role !== "admin" && user.id !== userId) {
    redirect(`/users/${user.id}/profile`)
  }

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", userId).single()

  if (!profile) {
    redirect("/users")
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إعدادات الملف الشخصي</h1>
        <p className="text-sm text-gray-600 mt-1">
          {currentUserProfile?.role === "admin" && user.id !== userId
            ? `تحديث معلومات المستخدم: ${profile.full_name}`
            : "قم بتحديث معلومات حسابك الشخصية"}
        </p>
      </div>

      <ProfileSettingsForm userId={userId} profile={profile} isAdmin={currentUserProfile?.role === "admin"} />
    </div>
  )
}
