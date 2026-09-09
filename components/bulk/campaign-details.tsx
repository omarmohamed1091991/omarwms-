"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import type { BulkMessage, BulkMessageRecipient } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"

interface CampaignDetailsProps {
  campaignId: string
  open: boolean
  onClose: () => void
}

export function CampaignDetails({ campaignId, open, onClose }: CampaignDetailsProps) {
  const [campaign, setCampaign] = useState<BulkMessage | null>(null)
  const [recipients, setRecipients] = useState<BulkMessageRecipient[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (open && campaignId) {
      loadCampaignDetails()
    }
  }, [campaignId, open])

  const loadCampaignDetails = async () => {
    setLoading(true)
    try {
      const { data: campaignData } = await supabase.from("bulk_messages").select("*").eq("id", campaignId).single()

      const { data: recipientsData } = await supabase
        .from("bulk_message_recipients")
        .select("*")
        .eq("bulk_message_id", campaignId)
        .order("created_at", { ascending: false })

      setCampaign(campaignData)
      setRecipients(recipientsData || [])
    } catch (error) {
      console.error("Error loading campaign details:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل الحملة</DialogTitle>
          <DialogDescription>عرض تفاصيل الحملة وحالة كل مستلم</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          campaign && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-lg">{campaign.campaign_name}</h3>
                <p className="text-gray-700">{campaign.message_text}</p>
                {campaign.media_url && <p className="text-sm text-blue-600">وسائط: {campaign.media_url}</p>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">إجمالي المستلمين</p>
                  <p className="text-2xl font-bold text-gray-900">{campaign.total_recipients}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">تم الإرسال</p>
                  <p className="text-2xl font-bold text-green-700">{campaign.sent_count}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">فشل</p>
                  <p className="text-2xl font-bold text-red-700">{campaign.failed_count}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-3">قائمة المستلمين</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-900">رقم الجوال</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-900">الحالة</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-900">تاريخ الإرسال</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recipients.map((recipient) => (
                        <tr key={recipient.id}>
                          <td className="px-4 py-2 text-sm">{recipient.recipient_phone}</td>
                          <td className="px-4 py-2 text-sm">
                            <Badge
                              variant={
                                recipient.status === "sent"
                                  ? "default"
                                  : recipient.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {recipient.status === "sent"
                                ? "مرسلة"
                                : recipient.status === "failed"
                                  ? "فشلت"
                                  : "قيد الانتظار"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {recipient.sent_at ? new Date(recipient.sent_at).toLocaleString("ar-SA") : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
