"use server"

import { createAdminClient } from "@/lib/supabase/admin"

function cleanAccessToken(token: string): string {
  if (!token) return ""

  // إزالة جميع أنواع المسافات والأحرف غير المرئية تماماً
  const cleaned = token
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, "") // إزالة Unicode spaces
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // إزالة zero-width spaces
    .replace(/\r?\n|\r/g, "") // إزالة line breaks
    .replace(/\s+/g, "") // إزالة جميع المسافات (space, tab, etc)
    .trim()

  return cleaned
}

export async function saveWhatsAppSettings(
  userId: string,
  settings: {
    whatsapp_business_account_id: string
    whatsapp_phone_number_id: string
    whatsapp_access_token: string
    whatsapp_webhook_verify_token: string
    whatsapp_connection_status: string
  },
) {
  try {
    console.log("[v0] Server Action: Saving settings for user:", userId)

    const supabase = createAdminClient()

    const cleanedToken = cleanAccessToken(settings.whatsapp_access_token)
    console.log("[v0] Original token length:", settings.whatsapp_access_token.length)
    console.log("[v0] Cleaned token length:", cleanedToken.length)
    console.log("[v0] Cleaned token last 30:", cleanedToken.slice(-30))

    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        whatsapp_business_account_id: settings.whatsapp_business_account_id,
        whatsapp_phone_number_id: settings.whatsapp_phone_number_id,
        whatsapp_access_token: cleanedToken,
        whatsapp_webhook_verify_token: settings.whatsapp_webhook_verify_token,
        whatsapp_connection_status: settings.whatsapp_connection_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Database error:", error)
      throw new Error(`فشل حفظ البيانات: ${error.message}`)
    }

    console.log("[v0] Settings saved successfully to database")
    return { success: true, data }
  } catch (error: any) {
    console.error("[v0] Error in saveWhatsAppSettings:", error)
    return { success: false, error: error.message }
  }
}

export async function getWhatsAppSettings(userId: string) {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "whatsapp_access_token, whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_connection_status, whatsapp_webhook_verify_token",
      )
      .eq("id", userId)
      .single()

    if (error) {
      console.error("[v0] Error fetching settings:", error)
      return null
    }

    if (data?.whatsapp_access_token) {
      const cleaned = cleanAccessToken(data.whatsapp_access_token)
      console.log("[v0] Loaded token length:", cleaned.length)
      console.log("[v0] Loaded token last 30:", cleaned.slice(-30))
      data.whatsapp_access_token = cleaned
    }

    return data
  } catch (error) {
    console.error("[v0] Error in getWhatsAppSettings:", error)
    return null
  }
}
