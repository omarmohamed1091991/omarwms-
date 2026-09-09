"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function sendIndividualMessage(
  userId: string,
  recipientPhone: string,
  messageText: string,
  useTemplate = false,
  templateName?: string,
  mediaId?: string, // إضافة معامل mediaId
) {
  try {
    const supabase = createAdminClient()

    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("whatsapp_access_token, whatsapp_phone_number_id")
      .eq("id", userId)
      .single()

    if (profileError || !userProfile) {
      return {
        success: false,
        error: "فشل في جلب إعدادات المستخدم",
      }
    }

    if (!userProfile.whatsapp_access_token || !userProfile.whatsapp_phone_number_id) {
      return {
        success: false,
        error: "يرجى إعداد WhatsApp API في الإعدادات أولاً",
      }
    }

    const cleanedToken = userProfile.whatsapp_access_token
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\r?\n|\r/g, "")
      .trim()

    const apiUrl = `https://graph.facebook.com/v21.0/${userProfile.whatsapp_phone_number_id}/messages`

    let requestBody: any

    if (useTemplate && templateName) {
      // إرسال باستخدام قالب
      const templatePayload: any = {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "ar",
          },
        },
      }

      // إذا كان القالب يحتوي على صورة، أضف معامل header
      if (mediaId) {
        templatePayload.template.components = [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  id: mediaId,
                },
              },
            ],
          },
        ]
      }

      requestBody = templatePayload
    } else {
      // إرسال رسالة نصية حرة
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: {
          body: messageText,
        },
      }
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[v0] WhatsApp API Error:", result)
      return {
        success: false,
        error: result.error?.message || "فشل إرسال الرسالة عبر WhatsApp API",
        errorDetails: result.error,
      }
    }

    const { error: insertError } = await supabase.from("individual_messages").insert({
      user_id: userId,
      recipient_phone: recipientPhone,
      message_text: messageText,
      status: "sent",
      sent_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("[v0] Error saving to individual_messages:", insertError)
    }

    const { error: inboxError } = await supabase.from("incoming_messages").insert({
      user_id: userId,
      sender_phone: recipientPhone,
      message_text: messageText,
      direction: "outgoing",
      message_type: "text",
      is_read: true,
      received_at: new Date().toISOString(),
      whatsapp_message_id: result.messages?.[0]?.id || null,
    })

    if (inboxError) {
      console.error("[v0] Error saving to incoming_messages:", inboxError)
    }

    return {
      success: true,
      messageId: result.messages?.[0]?.id,
    }
  } catch (error) {
    console.error("[v0] Error in sendIndividualMessage:", error)
    return {
      success: false,
      error: "حدث خطأ أثناء إرسال الرسالة",
    }
  }
}
