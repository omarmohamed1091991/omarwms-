import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, senderPhone, messageText, mediaUrl } = body

    if (!userId || !senderPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const insertResult = await supabase.from("incoming_messages").insert({
      user_id: userId,
      sender_phone: senderPhone,
      message_text: messageText || null,
      media_url: mediaUrl || null,
      is_read: false,
    })

    if (insertResult.error) {
      throw insertResult.error
    }

    const settingsResult = await supabase.from("user_settings").select("*").eq("user_id", userId).single()

    const settings = settingsResult.data

    if (settings?.auto_reply_enabled && settings.auto_reply_message) {
      console.log("[v0] Auto-reply would be sent:", settings.auto_reply_message)
    }

    if (settings?.webhook_url) {
      try {
        await fetch(settings.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            senderPhone,
            messageText,
            mediaUrl,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (webhookError) {
        console.error("[v0] Webhook error:", webhookError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
