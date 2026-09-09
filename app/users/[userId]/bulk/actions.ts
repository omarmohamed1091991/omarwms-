"use server"

import { createAdminClient } from "@/lib/supabase/admin"

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendWhatsAppMessageWithRetry(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  templateName: string,
  templateLanguage: string,
  mediaId?: string,
  templateComponents?: any[],
  maxRetries = 3,
): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendWhatsAppMessage(
        phoneNumberId,
        accessToken,
        recipientPhone,
        templateName,
        templateLanguage,
        mediaId,
        templateComponents,
      )
      return result
    } catch (error: any) {
      lastError = error

      // إذا كان الخطأ 131000 (rate limit أو server error)، انتظر ثم أعد المحاولة
      if (error.message?.includes("131000") || error.message?.includes("Something went wrong")) {
        const waitTime = attempt * 2000 // 2s, 4s, 6s
        console.log(
          `[v0] Rate limit hit for ${recipientPhone}, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`,
        )
        await delay(waitTime)
        continue
      }

      // إذا كان خطأ آخر، لا تعيد المحاولة
      throw error
    }
  }

  throw lastError || new Error("فشل الإرسال بعد عدة محاولات")
}

async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  templateName: string,
  templateLanguage = "en_US",
  mediaId?: string,
  templateComponents?: any[],
) {
  const cleanToken = cleanAccessToken(accessToken)

  const messagePayload: any = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: templateLanguage,
      },
    },
  }

  if (templateComponents && templateComponents.length > 0) {
    const components: any[] = []

    const headerComponent = templateComponents.find((c: any) => c.type === "HEADER")

    if (headerComponent && headerComponent.format === "IMAGE") {
      if (mediaId) {
        components.push({
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                id: mediaId,
              },
            },
          ],
        })
      } else if (headerComponent.example?.header_handle?.[0]) {
        components.push({
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: headerComponent.example.header_handle[0],
              },
            },
          ],
        })
      } else {
        throw new Error("القالب يتطلب صورة في header لكن لم يتم اختيار صورة. يرجى اختيار صورة من المكتبة.")
      }
    }

    const bodyComponent = templateComponents.find((c: any) => c.type === "BODY")
    if (bodyComponent && bodyComponent.text) {
      const variables = bodyComponent.text.match(/\{\{(\d+)\}\}/g)
      if (variables && variables.length > 0) {
        // يمكن إضافة parameters للـ body هنا إذا لزم الأمر
      }
    }

    if (components.length > 0) {
      messagePayload.template.components = components
    }
  }

  console.log("[v0] Sending WhatsApp message to:", recipientPhone)
  console.log("[v0] Template name:", templateName)
  console.log("[v0] Media ID:", mediaId)
  console.log("[v0] Message payload:", JSON.stringify(messagePayload, null, 2))

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messagePayload),
  })

  const result = await response.json()
  console.log("[v0] WhatsApp API response:", JSON.stringify(result))

  if (!response.ok) {
    throw new Error(result.error?.message || "فشل إرسال الرسالة عبر WhatsApp API")
  }

  return result
}

export async function sendBulkMessagesAction({
  userId,
  phoneNumbers,
  templateName,
  templateData,
  parameters,
  mediaId,
  accessToken,
  phoneNumberId,
}: {
  userId: string
  phoneNumbers: string[]
  templateName: string
  templateData?: any
  parameters?: any
  mediaId?: string
  accessToken: string
  phoneNumberId: string
}) {
  try {
    const supabase = createAdminClient()

    console.log("[v0] Starting bulk message sending...")
    console.log("[v0] Total numbers:", phoneNumbers.length)

    if (!accessToken || !phoneNumberId) {
      return { success: false, error: "يرجى تكوين إعدادات WhatsApp API أولاً", sent: 0, failed: 0 }
    }

    const results = []
    let sent = 0
    let failed = 0

    const templateLanguage = templateData?.language || "en_US"
    const templateComponents = templateData?.components || []

    const BATCH_SIZE = 5 // تقليل من 10 إلى 5
    const DELAY_BETWEEN_MESSAGES = 200 // 200ms بين كل رسالة
    const DELAY_BETWEEN_BATCHES = 1000 // 1 ثانية بين كل دفعة
    const total = phoneNumbers.length

    for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
      const batch = phoneNumbers.slice(i, i + BATCH_SIZE)

      for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
        const phoneNumber = batch[batchIndex]
        const currentIndex = i + batchIndex + 1

        try {
          const result = await sendWhatsAppMessageWithRetry(
            phoneNumberId,
            accessToken,
            phoneNumber,
            templateName,
            templateLanguage,
            mediaId,
            templateComponents,
            3, // 3 محاولات
          )

          await supabase.from("individual_messages").insert({
            user_id: userId,
            recipient_phone: phoneNumber,
            message_text: JSON.stringify({
              template: templateName,
              language: templateLanguage,
              whatsapp_message_id: result.messages?.[0]?.id || null,
            }),
            media_url: mediaId || null,
            status: "sent",
            sent_at: new Date().toISOString(),
          })

          sent++
          results.push({ phone: phoneNumber, success: true, currentIndex })
        } catch (error: any) {
          console.error(`[v0] Error sending to ${phoneNumber}:`, error.message)

          await supabase.from("individual_messages").insert({
            user_id: userId,
            recipient_phone: phoneNumber,
            message_text: JSON.stringify({ template: templateName, error: error.message }),
            media_url: mediaId || null,
            status: "failed",
          })

          failed++
          results.push({ phone: phoneNumber, success: false, error: error.message, currentIndex })
        }

        if (batchIndex < batch.length - 1) {
          await delay(DELAY_BETWEEN_MESSAGES)
        }
      }

      if (i + BATCH_SIZE < phoneNumbers.length) {
        await delay(DELAY_BETWEEN_BATCHES)
      }
    }

    console.log(`[v0] Bulk sending complete. Sent: ${sent}, Failed: ${failed}`)

    return {
      success: true,
      sent,
      failed,
      totalRecipients: phoneNumbers.length,
      results,
    }
  } catch (error: any) {
    console.error("[v0] Error in sendBulkMessagesAction:", error)
    return { success: false, error: error.message || "حدث خطأ غير متوقع", sent: 0, failed: 0 }
  }
}

export async function getMessagingLimits(userId: string) {
  const supabase = createAdminClient()

  const { data: userProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (profileError || !userProfile) {
    console.error("[v0] Error fetching user profile:", profileError)
    return null
  }

  const limits: Record<string, number> = {
    UNVERIFIED: 250,
    LOW: 1000,
    MEDIUM: 10000,
    HIGH: 100000,
    UNLIMITED: 1000000,
  }

  const tier = userProfile.messaging_tier || "LOW"
  const qualityRating = userProfile.quality_rating || "GREEN"
  const limit = limits[tier] || 1000

  console.log("[v0] Meta tier and limit:", { tier, limit, qualityRating })

  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  // استخدام data.length بدلاً من count
  const { data: individualData } = await supabase
    .from("individual_messages")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["sent", "delivered"])
    .gte("sent_at", startOfDay)
    .lte("sent_at", endOfDay)

  const individualCount = individualData?.length || 0

  const { data: bulkMessages } = await supabase.from("bulk_messages").select("id").eq("user_id", userId)

  const bulkMessageIds = bulkMessages?.map((msg) => msg.id) || []

  let bulkCount = 0
  if (bulkMessageIds.length > 0) {
    const { data } = await supabase
      .from("bulk_message_recipients")
      .select("id")
      .in("status", ["sent", "delivered"])
      .in("bulk_message_id", bulkMessageIds)
      .gte("sent_at", startOfDay)
      .lte("sent_at", endOfDay)

    bulkCount = data?.length || 0
  }

  const sentToday = individualCount + bulkCount

  console.log("[v0] Messages sent today:", {
    individualCount,
    bulkCount,
    totalSentToday: sentToday,
    tier,
    limit,
  })

  return {
    sentToday,
    dailyLimit: limit,
    remaining: Math.max(0, limit - sentToday),
    tier,
    qualityRating,
  }
}

export async function getMetaMessagingStatus(userId: string) {
  const supabase = createAdminClient()

  const { data: userProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (profileError || !userProfile) {
    console.error("[v0] Error fetching user profile:", profileError)
    return null
  }

  const tier = userProfile.messaging_tier || "UNLIMITED"
  const qualityRating = userProfile.quality_rating || "GREEN"

  // حد لا محدود للجميع
  const limit = Number.MAX_SAFE_INTEGER

  console.log("[v0] Meta tier and limit:", { tier, limit: "UNLIMITED", qualityRating })

  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  // استخدام data.length بدلاً من count
  const { data: individualData } = await supabase
    .from("individual_messages")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["sent", "delivered"])
    .gte("sent_at", startOfDay)
    .lte("sent_at", endOfDay)

  const individualCount = individualData?.length || 0

  const { data: bulkMessages } = await supabase.from("bulk_messages").select("id").eq("user_id", userId)

  const bulkMessageIds = bulkMessages?.map((msg) => msg.id) || []

  let bulkCount = 0
  if (bulkMessageIds.length > 0) {
    const { data } = await supabase
      .from("bulk_message_recipients")
      .select("id")
      .in("status", ["sent", "delivered"])
      .in("bulk_message_id", bulkMessageIds)
      .gte("sent_at", startOfDay)
      .lte("sent_at", endOfDay)

    bulkCount = data?.length || 0
  }

  const sentToday = individualCount + bulkCount

  console.log("[v0] Messages sent today:", {
    individualCount,
    bulkCount,
    totalSentToday: sentToday,
    tier,
    limit: "UNLIMITED",
  })

  return {
    sentToday,
    dailyLimit: limit,
    remaining: limit, // دائماً لا محدود
    tier: "UNLIMITED",
    qualityRating,
  }
}
