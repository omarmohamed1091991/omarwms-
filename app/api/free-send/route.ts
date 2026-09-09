import { createAdminClient } from "@/lib/supabase/admin"
import type { NextRequest } from "next/server"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendFreeWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  messageText: string,
  mediaId?: string | null,
  mediaUrl?: string | null,
  useTemplate?: boolean,
  templateName?: string,
  templateLanguage?: string,
): Promise<{ success: boolean; messageId?: string; error?: string; errorCode?: string }> {
  const cleanPhone = recipientPhone.replace(/[^\d]/g, "")

  let payload: any

  if (useTemplate && templateName) {
    payload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: templateLanguage || "ar",
        },
      },
    }

    if (mediaId) {
      payload.template.components = [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: { id: mediaId },
            },
          ],
        },
      ]
    }
  } else if (mediaId || mediaUrl) {
    payload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "image",
      image: mediaId ? { id: mediaId, caption: messageText } : { link: mediaUrl, caption: messageText },
    }
  } else {
    payload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "text",
      text: { body: messageText },
    }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (result.error) {
      return {
        success: false,
        error: result.error.message || result.error.error_data?.details || "Unknown error",
        errorCode: result.error.code?.toString(),
      }
    }

    if (result.messages && result.messages.length > 0 && result.messages[0].id) {
      return {
        success: true,
        messageId: result.messages[0].id,
      }
    }

    // إذا لم يكن هناك message ID، اعتبرها فاشلة
    return {
      success: false,
      error: "لم يتم إرجاع معرف رسالة من WhatsApp API - قد تكون الرسالة لم تُقبل",
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "خطأ في الشبكة",
    }
  }
}

async function sendWithRetry(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  messageText: string,
  mediaId: string | null,
  mediaUrl: string | null,
  useTemplate: boolean,
  templateName: string | undefined,
  templateLanguage: string | undefined,
  maxRetries: number,
): Promise<{ success: boolean; messageId?: string; error?: string; errorCode?: string }> {
  let lastResult: { success: boolean; messageId?: string; error?: string; errorCode?: string } = {
    success: false,
    error: "Unknown error",
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await sendFreeWhatsAppMessage(
      phoneNumberId,
      accessToken,
      recipientPhone,
      messageText,
      mediaId,
      mediaUrl,
      useTemplate,
      templateName,
      templateLanguage,
    )

    if (result.success) {
      return result
    }

    lastResult = result

    const isRateLimitError =
      result.errorCode === "131000" ||
      result.errorCode === "80007" ||
      result.errorCode === "80008" ||
      result.error?.includes("131000")

    if (isRateLimitError && attempt < maxRetries) {
      // exponential backoff
      const waitTime = Math.min(attempt * 3000, 10000)
      await delay(waitTime)
      continue
    }

    // أي خطأ آخر، لا نحاول مرة أخرى
    break
  }

  return lastResult
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 })
  }

  const {
    userId,
    phoneNumbers,
    messageText,
    mediaId,
    mediaUrl,
    accessToken,
    phoneNumberId,
    useTemplate,
    templateName,
    templateLanguage,
  } = body

  if (!userId || !phoneNumbers || !accessToken || !phoneNumberId) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
  }

  if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    return new Response(JSON.stringify({ error: "phoneNumbers must be a non-empty array" }), { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch (error) {
          clearInterval(heartbeatInterval)
        }
      }, 20000)

      try {
        const supabase = createAdminClient()

        const BATCH_SIZE = 10
        const DELAY_BETWEEN_MESSAGES = 150
        const DELAY_BETWEEN_BATCHES = 1000
        const total = phoneNumbers.length

        let sent = 0
        let failed = 0

        sendProgress({ type: "start", total, sent: 0, failed: 0, current: 0 })

        for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
          const batch = phoneNumbers.slice(i, i + BATCH_SIZE)

          const batchPromises = batch.map(async (phoneNumber, batchIndex) => {
            const current = i + batchIndex + 1

            // تأخير بين الرسائل
            await delay(batchIndex * DELAY_BETWEEN_MESSAGES)

            const result = await sendWithRetry(
              phoneNumberId,
              accessToken,
              phoneNumber,
              messageText || "",
              mediaId || null,
              mediaUrl || null,
              useTemplate || false,
              templateName,
              templateLanguage,
              3,
            )

            if (result.success && result.messageId) {
              await supabase.from("individual_messages").insert({
                user_id: userId,
                recipient_phone: phoneNumber,
                message_text: messageText || templateName || "",
                media_url: mediaId || mediaUrl || null,
                status: "sent",
                sent_at: new Date().toISOString(),
                message_type: useTemplate ? "template" : "free",
                whatsapp_message_id: result.messageId,
                delivery_status: "accepted",
              })

              return { success: true, phoneNumber, current }
            } else {
              await supabase.from("individual_messages").insert({
                user_id: userId,
                recipient_phone: phoneNumber,
                message_text: JSON.stringify({
                  text: messageText || templateName || "",
                  error: result.error,
                  error_code: result.errorCode,
                }),
                media_url: mediaId || mediaUrl || null,
                status: "failed",
                message_type: useTemplate ? "template" : "free",
                delivery_status: "rejected",
              })

              return { success: false, phoneNumber, current }
            }
          })

          const batchResults = await Promise.all(batchPromises)

          // معالجة النتائج
          for (const result of batchResults) {
            if (result.success) {
              sent++
            } else {
              failed++
            }

            sendProgress({
              type: "progress",
              current: result.current,
              total,
              sent,
              failed,
              percentage: Math.round((result.current / total) * 100),
            })
          }

          // تأخير بين الدفعات
          if (i + BATCH_SIZE < phoneNumbers.length) {
            await delay(DELAY_BETWEEN_BATCHES)
          }
        }

        clearInterval(heartbeatInterval)
        sendProgress({ type: "complete", total, sent, failed })
        controller.close()
      } catch (error: any) {
        clearInterval(heartbeatInterval)
        sendProgress({ type: "error", message: error.message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
