import type { SupabaseClient } from "@supabase/supabase-js"
import { parseIncomingWhatsAppMessage } from "@/lib/whatsapp-messages"

// حقول Webhook الخاصة بصدى الرسائل في تطبيق WhatsApp Business (الهاتف المحمول).
// عندما يرسل صاحب الحساب رسالة من تطبيق الهاتف، ترسل Meta نسخة منها ضمن
// change.field = "smb_message_echoes" وتكون الرسائل في change.value.message_echoes.
export const MESSAGE_ECHO_FIELDS = new Set(["smb_message_echoes", "message_echoes"])

const normalizePhone = (value: unknown) => (typeof value === "string" ? value.replace(/\D/g, "") : "")

export function getMessageEchoes(change: any): any[] {
  const value = change?.value || {}
  const echoes = value.message_echoes ?? value.smb_message_echoes
  if (Array.isArray(echoes)) return echoes
  // احتياطاً: بعض الإصدارات ترسل الرسائل داخل messages مع اسم الحقل الخاص بالصدى
  if (MESSAGE_ECHO_FIELDS.has(change?.field) && Array.isArray(value.messages)) return value.messages
  return []
}

/**
 * يحفظ رسائل الصدى (المرسلة من تطبيق الهاتف) كرسائل صادرة في صندوق الوارد
 * لكل مستخدم مرتبط برقم الهاتف، مرتبطة بمحادثة رقم العميل (حقل to).
 */
export async function saveMessageEchoes(supabase: SupabaseClient, change: any, targetUserIds: string[]) {
  const echoes = getMessageEchoes(change)
  if (!echoes.length || !targetUserIds.length) return

  const businessPhone = normalizePhone(change?.value?.metadata?.display_phone_number)

  for (const echo of echoes) {
    // رقم العميل هو المستلم؛ إن لم يتوفر نأخذ الطرف الذي ليس رقم النشاط التجاري
    const to = normalizePhone(echo?.to)
    const from = normalizePhone(echo?.from)
    const customerPhone = to || (from && from !== businessPhone ? from : "")
    if (!customerPhone) {
      console.log("[v0] Message echo without recipient, skipping:", echo?.id)
      continue
    }

    let recipients = targetUserIds
    if (echo.id) {
      const { data: existing } = await supabase
        .from("incoming_messages")
        .select("user_id")
        .eq("whatsapp_message_id", echo.id)
        .in("user_id", targetUserIds)
      const saved = new Set((existing || []).map((row: { user_id: string }) => row.user_id))
      recipients = targetUserIds.filter((id) => !saved.has(id))
      if (!recipients.length) continue
    }

    const { messageType, messageText, mediaId } = parseIncomingWhatsAppMessage(echo)
    const sentAt = echo.timestamp ? new Date(Number(echo.timestamp) * 1000).toISOString() : new Date().toISOString()

    const { error } = await supabase.from("incoming_messages").insert(
      recipients.map((userId) => ({
        user_id: userId,
        sender_phone: customerPhone,
        sender_name: null,
        message_text: messageText,
        message_type: messageType,
        media_url: mediaId,
        whatsapp_message_id: echo.id || null,
        direction: "outgoing",
        is_read: true,
        received_at: sentAt,
      })),
    )

    if (error) {
      console.error("[v0] Error saving message echo for users:", recipients, error)
    } else {
      console.log("[v0] Saved outgoing message echo to:", customerPhone, "for users:", recipients)
    }
  }
}
