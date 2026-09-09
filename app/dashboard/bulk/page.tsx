import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreateCampaignButton } from "@/components/bulk/create-campaign-button"
import { CampaignsList } from "@/components/bulk/campaigns-list"

export default async function BulkMessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: campaigns } = await supabase
    .from("bulk_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">الرسائل الجماعية</h1>
          <p className="text-gray-600">أنشئ وأرسل حملات رسائل جماعية لمئات المستلمين</p>
        </div>
        <CreateCampaignButton userId={user.id} />
      </div>

      <CampaignsList campaigns={campaigns || []} />
    </div>
  )
}
