import { createAdminClient } from "@/lib/supabase/admin"
import type { NextRequest } from "next/server"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatPhoneNumber(
  phone: string,
  countryCode: string,
): { isValid: boolean; formatted: string; reason?: string } {
  let cleaned = phone.replace(/[^\d]/g, "")

  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1)
  }

  const cleanCountryCode = countryCode.replace(/[^\d]/g, "")

  if (!cleaned.startsWith(cleanCountryCode)) {
    cleaned = cleanCountryCode + cleaned
  }

  if (cleaned.length < 10 || cleaned.length > 15) {
    return {
      isValid: false,
      formatted: cleaned,
      reason: `طول الرقم غير صحيح: ${cleaned.length} أرقام`,
    }
  }

  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      formatted: cleaned,
      reason: "الرقم يحتوي على أحرف غير رقمية",
    }
  }

  return { isValid: true, formatted: cleaned }
}

function parseWhatsAppError(error: any): {
  code: string
  message: string
  isPaused: boolean
  isRateLimit: boolean
  isInvalidNumber: boolean
  isInvalidParameter: boolean
} {
  const errorMessage = error.message || ""
  const codeMatch = errorMessage.match(/#(\d+)/)
  const code = codeMatch ? codeMatch[1] : "unknown"

  return {
    code,
    message: errorMessage,
    isPaused: code === "132015",
    isRateLimit: code === "131000" || code === "80007" || code === "4" || code === "80008",
    isInvalidNumber: code === "131026" || code === "131021" || errorMessage.includes("not a valid WhatsApp"),
    isInvalidParameter: code === "100",
  }
}

async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  templateName: string,
  templateLanguage: string,
  mediaId?: string,
  templateComponents?: any[],
): Promise<{ success: boolean; messageId?: string; error?: string; errorCode?: string }> {
  const headerComponent = templateComponents?.find((c: any) => c.type === "HEADER")
  const hasMediaHeader = headerComponent && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format)

  const components: any[] = []

  if (hasMediaHeader && mediaId) {
    const mediaType = headerComponent.format.toLowerCase()
    components.push({
      type: "header",
      parameters: [
        {
          type: mediaType,
          [mediaType]: {
            id: mediaId,
          },
        },
      ],
    })
  }

  const payload: any = {
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

  if (components.length > 0) {
    payload.template.components = components
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

    if (!response.ok) {
      const errorMessage = result.error?.message || "فشل إرسال الرسالة"
      const errorCode = result.error?.code?.toString() || "unknown"
      return {
        success: false,
        error: errorMessage,
        errorCode: errorCode,
      }
    }

    const messageId = result.messages?.[0]?.id
    if (!messageId) {
      return {
        success: false,
        error: "لم يتم استلام معرف الرسالة من WhatsApp",
        errorCode: "no_message_id",
      }
    }

    return {
      success: true,
      messageId: messageId,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "خطأ في الاتصال",
      errorCode: "network_error",
    }
  }
}

async function sendWithRetry(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  templateName: string,
  templateLanguage: string,
  mediaId: string | undefined,
  templateComponents: any[] | undefined,
  maxRetries: number,
): Promise<{ success: boolean; messageId?: string; error?: string; errorCode?: string; isPaused?: boolean }> {
  let lastResult: { success: boolean; messageId?: string; error?: string; errorCode?: string } | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await sendWhatsAppMessage(
      phoneNumberId,
      accessToken,
      recipientPhone,
      templateName,
      templateLanguage,
      mediaId,
      templateComponents,
    )

    if (result.success) {
      return result
    }

    lastResult = result

    const parsedError = parseWhatsAppError({ message: result.error, code: result.errorCode })
    if (parsedError.isPaused) {
      return { ...result, isPaused: true }
    }
    if (parsedError.isInvalidNumber || parsedError.isInvalidParameter) {
      return result
    }

    if (parsedError.isRateLimit && attempt < maxRetries) {
      const waitTime = Math.min(attempt * 3000, 10000)
      await delay(waitTime)
      continue
    }

    break
  }

  return lastResult || { success: false, error: "فشل بعد عدة محاولات", errorCode: "max_retries" }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const body = await request.json()
  const { userId, phoneNumbers, templateName, templateData, mediaId, accessToken, phoneNumberId, countryCode } = body

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (error) {
          // تجاهل الأخطاء إذا تم إغلاق الاتصال
        }
      }

      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch (error) {
          clearInterval(heartbeatInterval)
        }
      }, 10000)

      try {
        const supabase = createAdminClient()
        const templateLanguage = templateData?.language || "ar"
        const templateComponents = templateData?.components || []

        const formattedNumbers: { original: string; formatted: string; isValid: boolean; reason?: string }[] = []
        const defaultCountryCode = countryCode || "966"

        for (const phone of phoneNumbers) {
          const result = formatPhoneNumber(phone, defaultCountryCode)
          formattedNumbers.push({
            original: phone,
            formatted: result.formatted,
            isValid: result.isValid,
            reason: result.reason,
          })
        }

        const validNumbers = formattedNumbers.filter((n) => n.isValid)
        const invalidNumbers = formattedNumbers.filter((n) => !n.isValid)

        const BATCH_SIZE = 10
        const DELAY_BETWEEN_MESSAGES = 150
        const DELAY_BETWEEN_BATCHES = 1000
        const total = phoneNumbers.length

        let delivered = 0
        let failed = invalidNumbers.length
        let templatePaused = false
        let pausedErrorMessage = ""

        for (const invalidNumber of invalidNumbers) {
          await supabase.from("individual_messages").insert({
            user_id: userId,
            recipient_phone: invalidNumber.original,
            message_text: JSON.stringify({
              template: templateName,
              error: invalidNumber.reason || "رقم هاتف غير صحيح",
              error_type: "invalid_phone",
              formatted_attempt: invalidNumber.formatted,
            }),
            media_url: mediaId || null,
            status: "failed",
            message_type: "template",
            delivery_status: "rejected",
          })
        }

        sendProgress({
          type: "start",
          total,
          delivered: 0,
          failed: invalidNumbers.length,
          current: invalidNumbers.length,
          invalidNumbers: invalidNumbers.length,
        })

        const numbersToSend = validNumbers.map((n) => n.formatted)

        let lastProcessedIndex = 0

        for (let i = 0; i < numbersToSend.length; i += BATCH_SIZE) {
          if (templatePaused) {
            const remainingNumbers = numbersToSend.slice(i)
            for (const phoneNumber of remainingNumbers) {
              await supabase.from("individual_messages").insert({
                user_id: userId,
                recipient_phone: phoneNumber,
                message_text: JSON.stringify({
                  template: templateName,
                  error: pausedErrorMessage,
                  error_type: "template_paused",
                }),
                media_url: mediaId || null,
                status: "failed",
                message_type: "template",
                delivery_status: "rejected",
              })
              failed++
            }

            sendProgress({
              type: "template_paused",
              current: total,
              total,
              delivered,
              failed,
              percentage: 100,
              errorMessage: pausedErrorMessage,
            })
            break
          }

          const batch = numbersToSend.slice(i, i + BATCH_SIZE)

          const batchPromises = batch.map(async (phoneNumber, batchIndex) => {
            const current = invalidNumbers.length + i + batchIndex + 1

            await delay(batchIndex * DELAY_BETWEEN_MESSAGES)

            const result = await sendWithRetry(
              phoneNumberId,
              accessToken,
              phoneNumber,
              templateName,
              templateLanguage,
              mediaId,
              templateComponents,
              3,
            )

            if (result.success && result.messageId) {
              await supabase.from("individual_messages").insert({
                user_id: userId,
                recipient_phone: phoneNumber,
                message_text: JSON.stringify({
                  template: templateName,
                  language: templateLanguage,
                  whatsapp_message_id: result.messageId,
                }),
                media_url: mediaId || null,
                status: "sent",
                sent_at: new Date().toISOString(),
                message_type: "template",
                whatsapp_message_id: result.messageId,
                delivery_status: "accepted",
              })

              return { success: true, phoneNumber, current, messageId: result.messageId }
            } else {
              await supabase.from("individual_messages").insert({
                user_id: userId,
                recipient_phone: phoneNumber,
                message_text: JSON.stringify({
                  template: templateName,
                  error: result.error,
                  error_code: result.errorCode,
                  error_type: result.isPaused ? "template_paused" : "send_failed",
                }),
                media_url: mediaId || null,
                status: "failed",
                message_type: "template",
                delivery_status: "rejected",
              })

              return {
                success: false,
                phoneNumber,
                current,
                error: result.error,
                isPaused: result.isPaused,
              }
            }
          })

          const batchResults = await Promise.all(batchPromises)

          for (const result of batchResults) {
            if (result.success) {
              delivered++
            } else {
              failed++
              if (result.isPaused) {
                templatePaused = true
                pausedErrorMessage = `القالب "${templateName}" تم إيقافه مؤقتاً من Meta بسبب جودة منخفضة. يرجى استخدام قالب آخر.`
              }
            }

            lastProcessedIndex = result.current

            sendProgress({
              type: templatePaused ? "template_paused" : "progress",
              current: result.current,
              total,
              delivered,
              failed,
              percentage: Math.round((result.current / total) * 100),
              ...(templatePaused && { errorMessage: pausedErrorMessage }),
            })
          }

          if (templatePaused) break

          if (i + BATCH_SIZE < numbersToSend.length) {
            await delay(DELAY_BETWEEN_BATCHES)
          }
        }

        clearInterval(heartbeatInterval)

        if (!templatePaused) {
          // إرسال إشعار الاكتمال مرتين لضمان وصوله
          const completeData = {
            type: "complete",
            total,
            delivered,
            failed,
            summary: {
              totalAttempted: total,
              deliveredToMeta: delivered,
              failedDelivery: failed,
              invalidNumbers: invalidNumbers.length,
            },
          }

          sendProgress(completeData)

          // إرسال مرة أخرى بعد تأخير قصير للتأكد
          await delay(100)
          sendProgress(completeData)
        }

        await delay(500)
        controller.close()
      } catch (error: any) {
        clearInterval(heartbeatInterval)
        sendProgress({
          type: "error",
          message: error.message || "حدث خطأ غير متوقع أثناء الإرسال",
        })
        await delay(200)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  })
}
