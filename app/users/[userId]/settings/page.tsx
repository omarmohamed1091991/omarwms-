import { createAdminClient } from "@/lib/supabase/admin"
import { WhatsAppSettingsForm } from "@/components/users/whatsapp-settings-form"
import Image from "next/image"

export const revalidate = 0

export default async function SettingsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = createAdminClient()

  const [profile, settings] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", userId).single(),
    supabase.from("user_settings").select("*").eq("user_id", userId).single(),
  ])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="RoseSmile" width={60} height={60} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
        <p className="text-gray-600 text-sm">إدارة إعدادات واتساب وقوالب الرسائل</p>
      </div>

      <WhatsAppSettingsForm userId={userId} profile={profile.data} settings={settings.data} />
    </div>
  )
}
