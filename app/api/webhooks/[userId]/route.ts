import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Webhook verification (GET request from Meta)
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = createAdminClient()
  const { userId } = await params
  const searchParams = request.nextUrl.searchParams

  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  console.log("[v0] Webhook GET request:", {
    userId,
    mode,
    receivedToken: token,
    challenge,
  })

  // التحقق من وجود البارامترات المطلوبة
  if (!mode || !token || !challenge) {
    console.log("[v0] Missing required parameters")
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  // جلب رمز التحقق من قاعدة البيانات
  const { data: profile, error: dbError } = await supabase
    .from("user_profiles")
    .select("whatsapp_webhook_verify_token")
    .eq("id", userId)
    .single()

  if (dbError || !profile) {
    console.log("[v0] Database error or profile not found:", dbError)
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  console.log("[v0] Webhook verification:", {
    receivedToken: token,
    expectedToken: profile.whatsapp_webhook_verify_token,
    match: token === profile.whatsapp_webhook_verify_token,
    mode,
  })

  // التحقق من صحة الرمز والوضع
  if (mode === "subscribe" && token === profile.whatsapp_webhook_verify_token) {
    console.log("[v0] Webhook verified successfully for user:", userId)
    // يجب إرجاع challenge فقط كنص عادي
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    })
  }

  console.log("[v0] Webhook verification failed")
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// Receive messages (POST request from Meta)
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = createAdminClient()
  const { userId } = await params

  try {
    const body = await request.json()
    console.log("[v0] Webhook received for user:", userId, JSON.stringify(body, null, 2))

    if (body.entry) {
      for (const entry of body.entry) {
        const changes = entry.changes || []

        for (const change of changes) {
          const phoneNumberId = change.value?.metadata?.phone_number_id

          console.log("[v0] Phone Number ID from Meta:", phoneNumberId)

          let targetUserIds = [userId]

          if (phoneNumberId) {
            const { data: userProfiles, error: userError } = await supabase
              .from("user_profiles")
              .select("id")
              .eq("whatsapp_phone_number_id", phoneNumberId)

            if (!userError && userProfiles?.length) {
              targetUserIds = Array.from(new Set(userProfiles.map((profile) => profile.id)))
            }
          }

          const contacts = change.value?.contacts || []
          const contactsMap: Record<string, string> = {}

          // بناء خريطة الأسماء من جهات الاتصال
          for (const contact of contacts) {
            if (contact.wa_id && contact.profile?.name) {
              contactsMap[contact.wa_id] = contact.profile.name
              console.log("[v0] Contact found:", contact.wa_id, "Name:", contact.profile.name)
            }
          }

          if (change.value?.messages) {
            for (const message of change.value.messages) {
              const senderName = contactsMap[message.from] || null

              // تحديد نوع الرسالة
              let messageType = "text"
              let messageText = ""
              let mediaUrl = null

              if (message.text?.body) {
                messageType = "text"
                messageText = message.text.body
              } else if (message.image) {
                messageType = "image"
                mediaUrl = message.image.id
                messageText = message.image.caption || "📷 صورة"
              } else if (message.audio) {
                messageType = "audio"
                mediaUrl = message.audio.id
                messageText = "🎵 رسالة صوتية"
              } else if (message.video) {
                messageType = "video"
                mediaUrl = message.video.id
                messageText = message.video.caption || "🎬 فيديو"
              } else if (message.document) {
                messageType = "document"
                mediaUrl = message.document.id
                messageText = message.document.filename || "📄 مستند"
              } else if (message.sticker) {
                messageType = "sticker"
                mediaUrl = message.sticker.id
                messageText = "🏷️ ملصق"
              } else if (message.location) {
                messageType = "location"
                messageText = `📍 موقع: ${message.location.latitude}, ${message.location.longitude}`
              } else if (message.contacts) {
                messageType = "contact"
                messageText = "👤 جهة اتصال"
              } else if (message.button?.text) {
                messageType = "button_reply"
                messageText = message.button.text
              } else if (message.interactive?.button_reply?.title) {
                messageType = "interactive_reply"
                messageText = message.interactive.button_reply.title
              } else if (message.interactive?.list_reply?.title) {
                messageType = "list_reply"
                messageText = message.interactive.list_reply.title
              }

              const receivedAt = message.timestamp
                ? new Date(Number(message.timestamp) * 1000).toISOString()
                : new Date().toISOString()

              const { error } = await supabase.from("incoming_messages").insert(
                targetUserIds.map((targetUserId) => ({
                  user_id: targetUserId,
                  sender_phone: message.from,
                  sender_name: senderName,
                  message_text: messageText,
                  message_type: messageType,
                  media_url: mediaUrl,
                  whatsapp_message_id: message.id || null,
                  direction: "incoming",
                  is_read: false,
                  received_at: receivedAt,
                })),
              )

              if (error) {
                console.error("[v0] Error saving incoming message for users:", targetUserIds, error)
              }
            }
          }

          if (change.value?.statuses) {
            for (const status of change.value.statuses) {
              console.log("[v0] Message status update:", status.id, status.status)
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("[v0] Webhook error for user:", userId, error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
