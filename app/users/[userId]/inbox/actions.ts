"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export interface IncomingMessage {
  id: string
  user_id: string
  sender_phone: string
  message_text: string
  media_url: string | null
  received_at: string
  is_read: boolean
  sender_name?: string
  message_type?: string
  direction?: string
  whatsapp_message_id?: string | null
}

export async function fetchMessagesFromServer(userId: string): Promise<IncomingMessage[]> {
  const supabase = createAdminClient()

  const allMessages: IncomingMessage[] = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  // جلب جميع الرسائل بدون حد أقصى
  while (hasMore) {
    const { data, error } = await supabase
      .from("incoming_messages")
      .select("*")
      .eq("user_id", userId)
      .order("received_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error("Error fetching messages page:", page, error)
      break
    }

    if (data && data.length > 0) {
      allMessages.push(...data)
    }

    // استمر في جلب الصفحات حتى لا توجد بيانات
    hasMore = data && data.length === pageSize
    page++
  }

  // عكس الترتيب ليكون من الأقدم للأحدث
  allMessages.reverse()

  return allMessages
}

export async function getIncomingMessages(userId: string): Promise<IncomingMessage[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("incoming_messages")
    .select("*")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching incoming messages:", error)
    throw new Error("فشل في جلب الرسائل الواردة")
  }

  return data || []
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from("incoming_messages").update({ is_read: true }).eq("id", messageId)

  if (error) {
    console.error("[v0] Error marking message as read:", error)
    throw new Error("فشل في تحديث حالة الرسالة")
  }
}

function cleanAccessToken(token: string): string {
  if (!token) return ""

  let cleaned = token
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r?\n|\r/g, "")
    .trim()

  if (cleaned.includes("/") || cleaned.includes("=")) {
    cleaned = cleaned.replace(/\s+/g, "+")
  } else {
    cleaned = cleaned.replace(/\s+/g, "")
  }

  return cleaned
}

export async function sendReplyMessage(
  userId: string,
  recipientPhone: string,
  messageText: string,
): Promise<{ success: boolean; error?: string; errorType?: string }> {
  try {
    const supabase = createAdminClient()

    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("whatsapp_access_token, whatsapp_phone_number_id")
      .eq("id", userId)
      .single()

    if (profileError || !userProfile) {
      return { success: false, error: "لم يتم العثور على إعدادات WhatsApp" }
    }

    if (!userProfile.whatsapp_access_token || !userProfile.whatsapp_phone_number_id) {
      return { success: false, error: "يرجى تكوين إعدادات WhatsApp API أولاً" }
    }

    const cleanToken = cleanAccessToken(userProfile.whatsapp_access_token)

    const response = await fetch(`https://graph.facebook.com/v21.0/${userProfile.whatsapp_phone_number_id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: {
          preview_url: false,
          body: messageText,
        },
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[v0] WhatsApp API error:", result)

      if (result.error?.code === 190) {
        // OAuth token expired or invalid
        return {
          success: false,
          error: "انتهت صلاحية رمز الوصول (Access Token). يرجى تحديث الرمز من صفحة الإعدادات.",
          errorType: "TOKEN_EXPIRED",
        }
      }

      return {
        success: false,
        error: result.error?.message || "فشل إرسال الرسالة",
      }
    }

    const { error: insertError } = await supabase.from("incoming_messages").insert({
      user_id: userId,
      sender_phone: recipientPhone,
      message_text: messageText,
      message_type: "text",
      direction: "outgoing",
      is_read: true,
      received_at: new Date().toISOString(),
      whatsapp_message_id: result.messages?.[0]?.id || null,
    })

    if (insertError) {
      console.error("[v0] Error saving outgoing message:", insertError)
    }

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error in sendReplyMessage:", error)
    return { success: false, error: error.message || "حدث خطأ غير متوقع" }
  }
}

export async function updateCustomerName(
  userId: string,
  senderPhone: string,
  customerName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("incoming_messages")
      .update({ sender_name: customerName })
      .eq("user_id", userId)
      .eq("sender_phone", senderPhone)

    if (error) {
      console.error("[v0] Error updating customer name:", error)
      return { success: false, error: "فشل في تحديث اسم العميل" }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteIncomingMessage(messageId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from("incoming_messages").delete().eq("id", messageId)

  if (error) {
    console.error("[v0] Error deleting message:", error)
    throw new Error("فشل في حذف الرسالة")
  }
}
