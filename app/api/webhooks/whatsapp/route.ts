import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  console.log("[v0] Webhook GET request:", { mode, token, challenge })

  if (!mode || !token || !challenge) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, whatsapp_webhook_verify_token")
    .eq("whatsapp_webhook_verify_token", token)
    .limit(1)

  if (profiles && profiles.length > 0 && mode === "subscribe") {
    console.log("[v0] Webhook verified successfully")
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  console.log("[v0] Webhook verification failed")
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Webhook received:", JSON.stringify(body, null, 2))

    if (body.entry) {
      for (const entry of body.entry) {
        const changes = entry.changes || []

        for (const change of changes) {
          const phoneNumberId = change.value?.metadata?.phone_number_id
          const displayPhoneNumber = change.value?.metadata?.display_phone_number

          console.log("[v0] Phone Number ID:", phoneNumberId)
          console.log("[v0] Display Phone Number:", displayPhoneNumber)

          if (!phoneNumberId) {
            console.log("[v0] No phone_number_id found, skipping")
            continue
          }

          const { data: userProfile, error: userError } = await supabase
            .from("user_profiles")
            .select("id, full_name")
            .eq("whatsapp_phone_number_id", phoneNumberId)
            .single()

          if (userError || !userProfile) {
            console.error("[v0] User not found for phone_number_id:", phoneNumberId, userError)
            continue
          }

          const userId = userProfile.id
          console.log("[v0] Message belongs to user:", userId, userProfile.full_name)

          // استخراج أسماء جهات الاتصال
          const contacts = change.value?.contacts || []
          const contactsMap: Record<string, string> = {}

          for (const contact of contacts) {
            if (contact.wa_id && contact.profile?.name) {
              contactsMap[contact.wa_id] = contact.profile.name
            }
          }

          // معالجة الرسائل
          if (change.value?.messages) {
            for (const message of change.value.messages) {
              const senderName = contactsMap[message.from] || null

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
              }

              console.log("[v0] Saving message from:", message.from, "to user:", userId)

              const { error } = await supabase.from("incoming_messages").insert({
                user_id: userId,
                sender_phone: message.from,
                sender_name: senderName,
                message_text: messageText,
                message_type: messageType,
                media_url: mediaUrl,
                whatsapp_message_id: message.id,
                direction: "incoming",
                is_read: false,
                received_at: new Date().toISOString(),
              })

              if (error) {
                console.error("[v0] Error saving message:", error)
              } else {
                console.log("[v0] Message saved successfully for user:", userId)
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
