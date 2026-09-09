import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get("media_id")
    const userId = searchParams.get("user_id")

    console.log("[v0] Media proxy request:", { mediaId, userId })

    if (!mediaId || !userId) {
      return new NextResponse("Missing parameters", { status: 400 })
    }

    const supabase = await createClient()

    // Get user's WhatsApp token
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("whatsapp_access_token")
      .eq("id", userId)
      .single()

    if (!userProfile?.whatsapp_access_token) {
      console.log("[v0] Token not found for user:", userId)
      return new NextResponse("Token not found", { status: 401 })
    }

    console.log("[v0] Fetching media from Meta API:", mediaId)

    // Fetch media URL from Meta API
    const metaResponse = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${userProfile.whatsapp_access_token}`,
      },
    })

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text()
      console.log("[v0] Meta API error:", errorText)
      return new NextResponse("Failed to fetch media info", { status: 500 })
    }

    const mediaInfo = await metaResponse.json()
    console.log("[v0] Media info received:", { url: mediaInfo.url, mime_type: mediaInfo.mime_type })

    // Fetch actual image data
    const imageResponse = await fetch(mediaInfo.url, {
      headers: {
        Authorization: `Bearer ${userProfile.whatsapp_access_token}`,
      },
    })

    if (!imageResponse.ok) {
      console.log("[v0] Image fetch failed:", imageResponse.status)
      return new NextResponse("Failed to fetch image", { status: 500 })
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    console.log("[v0] Image fetched successfully, size:", imageBuffer.byteLength)

    // Return image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": mediaInfo.mime_type || "image/jpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error("[v0] Media proxy error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
