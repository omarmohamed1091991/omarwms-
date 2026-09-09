"use server"

import { createClient } from "@/lib/supabase/server"

export async function getMediaLibrary(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("media_library")
    .select("*")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false })

  if (error) {
    return { success: false, error: error.message, media: [] }
  }

  return { success: true, media: data || [] }
}

export async function uploadMediaToWhatsApp(
  userId: string,
  file: File,
  whatsappPhoneNumberId: string,
  accessToken: string,
) {
  try {
    const formData = new FormData()
    formData.append("messaging_product", "whatsapp")
    formData.append("file", file)
    formData.append(
      "type",
      file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document",
    )

    const response = await fetch(`https://graph.facebook.com/v21.0/${whatsappPhoneNumberId}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      return {
        success: false,
        error: result.error?.message || "فشل رفع الصورة إلى WhatsApp",
      }
    }

    const supabase = await createClient()
    const { data: mediaData, error: dbError } = await supabase
      .from("media_library")
      .insert({
        user_id: userId,
        media_id: result.id,
        media_type: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document",
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single()

    if (dbError) {
      return {
        success: false,
        error: "تم رفع الصورة لكن فشل حفظ المعلومات",
        mediaId: result.id,
      }
    }

    return {
      success: true,
      media: mediaData,
      mediaId: result.id,
    }
  } catch (error) {
    console.error("[v0] Error uploading media:", error)
    return {
      success: false,
      error: "حدث خطأ أثناء رفع الصورة",
    }
  }
}

export async function deleteMedia(userId: string, mediaId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("media_library").delete().eq("user_id", userId).eq("id", mediaId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getMediaLibraryWithUrls(userId: string) {
  const supabase = await createClient()

  const { data: mediaData, error } = await supabase
    .from("media_library")
    .select("*")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false })

  if (error) {
    return { success: false, error: error.message, media: [] }
  }

  return { success: true, media: mediaData || [] }
}
