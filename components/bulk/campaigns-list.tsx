"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { BulkMessage } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { Eye, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CampaignDetails } from "./campaign-details"

interface CampaignsListProps {
  campaigns: BulkMessage[]
}

export function CampaignsList({ campaigns }: CampaignsListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (campaignId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الحملة؟")) return

    setDeleting(campaignId)
    try {
      const { error } = await supabase.from("bulk_messages").delete().eq("id", campaignId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error deleting campaign:", error)
    } finally {
      setDeleting(null)
    }
  }

  if (campaigns.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">لا توجد حملات رسائل جماعية بعد</p>
          <p className="text-sm">ابدأ بإنشاء حملتك الأولى</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{campaign.campaign_name}</h3>
                  <Badge
                    variant={
                      campaign.status === "completed"
                        ? "default"
                        : campaign.status === "failed"
                          ? "destructive"
                          : campaign.status === "sending"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {campaign.status === "completed"
                      ? "مكتملة"
                      : campaign.status === "failed"
                        ? "فشلت"
                        : campaign.status === "sending"
                          ? "جاري الإرسال"
                          : "مسودة"}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-3 line-clamp-2">{campaign.message_text}</p>
                <div className="flex gap-6 text-sm text-gray-500">
                  <span>إجمالي المستلمين: {campaign.total_recipients}</span>
                  <span>تم الإرسال: {campaign.sent_count}</span>
                  <span>فشل: {campaign.failed_count}</span>
                  <span>
                    {formatDistanceToNow(new Date(campaign.created_at), {
                      addSuffix: true,
                      locale: ar,
                    })}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(campaign.id)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(campaign.id)}
                  disabled={deleting === campaign.id}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>

            {/* شريط التقدم */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    campaign.total_recipients > 0 ? (campaign.sent_count / campaign.total_recipients) * 100 : 0
                  }%`,
                }}
              />
            </div>
          </Card>
        ))}
      </div>

      {selectedCampaign && (
        <CampaignDetails
          campaignId={selectedCampaign}
          open={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </>
  )
}
