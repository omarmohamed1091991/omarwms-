import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth"

function cleanAccessToken(token: string): string {
  return token
    .replace(/[   -   　​-‍﻿]/g, "")
    .replace(/\s+/g, "")
    .trim()
}

// يتحقق أن معرف الوسائط يخص هذا المستخدم (مكتبة الصور أو رسائل واردة/صادرة)
async function userOwnsMedia(supabase: ReturnType<typeof createAdminClient>, userId: string, mediaId: string) {
  const lookups = await Promise.all([
    supabase.from("media_library").select("id").eq("user_id", userId).eq("media_id", mediaId).limit(1),
    supabase.from("incoming_messages").select("id").eq("user_id", userId).eq("media_url", mediaId).limit(1),
    supabase.from("individual_messages").select("id").eq("user_id", userId).eq("media_url", mediaId).limit(1),
  ])
  return lookups.some(({ data }) => (data?.length || 0) > 0)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get("media_id")
    const userId = searchParams.get("user_id")
    const download = searchParams.get("download") === "1"

    if (!mediaId || !userId) {
      return new NextResponse("Missing parameters", { status: 400 })
    }

    const sessionUser = await getSessionUser()
    if (!sessionUser || (sessionUser.id !== userId && sessionUser.role !== "admin")) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const supabase = createAdminClient()

    if (!(await userOwnsMedia(supabase, userId, mediaId))) {
      return new NextResponse("Media not found", { status: 404 })
    }

    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("whatsapp_access_token")
      .eq("id", userId)
      .single()

    if (!userProfile?.whatsapp_access_token) {
      return new NextResponse("Token not found", { status: 401 })
    }

    const token = cleanAccessToken(userProfile.whatsapp_access_token)

    // رابط الوسائط من Meta مؤقت، لذلك نطلبه في كل مرة باستخدام معرف الوسائط
    const metaResponse = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(mediaId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!metaResponse.ok) {
      console.log("[v0] Meta media info error:", metaResponse.status, await metaResponse.text())
      return new NextResponse("Failed to fetch media info", { status: 502 })
    }

    const mediaInfo = await metaResponse.json()

    const fileResponse = await fetch(mediaInfo.url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!fileResponse.ok) {
      console.log("[v0] Media file fetch failed:", fileResponse.status)
      return new NextResponse("Failed to fetch media", { status: 502 })
    }

    const buffer = await fileResponse.arrayBuffer()
    const headers: Record<string, string> = {
      "Content-Type": mediaInfo.mime_type || fileResponse.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    }
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="whatsapp-${mediaId}"`
    }

    return new NextResponse(buffer, { headers })
  } catch (error) {
    console.error("[v0] Media proxy error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
