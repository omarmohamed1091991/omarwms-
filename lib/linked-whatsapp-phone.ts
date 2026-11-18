import { createHash } from "crypto"
import { unstable_cache } from "next/cache"
import { GRAPH_API_VERSION } from "@/lib/meta"

function cleanToken(token: string) {
  return token.replace(/[​-‍﻿]/g, "").replace(/\s+/g, "").trim()
}

/**
 * يجلب رقم واتساب المربوط (display_phone_number) من Meta.
 * النتيجة مخزنة مؤقتاً بمفتاح يعتمد على معرف الرقم والتوكن، لذلك تتغير تلقائياً
 * فور تغيير إعدادات واتساب دون الحاجة لتخزين الرقم في قاعدة البيانات.
 */
export async function getLinkedWhatsAppPhone(profile: {
  whatsapp_phone_number_id?: string | null
  whatsapp_access_token?: string | null
  whatsapp_connection_status?: string | null
}): Promise<string | null> {
  const phoneNumberId = String(profile.whatsapp_phone_number_id || "").trim()
  const token = cleanToken(profile.whatsapp_access_token || "")
  if (!phoneNumberId || !token || profile.whatsapp_connection_status !== "connected") return null

  const tokenHash = createHash("sha256").update(token).digest("hex").slice(0, 16)

  const load = unstable_cache(
    async () => {
      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(4000) },
      )
      const json = await res.json().catch(() => ({}))
      const display = res.ok ? String(json?.display_phone_number || "").trim() : ""
      // رمي الخطأ يمنع تخزين النتيجة الفاشلة مؤقتاً
      if (!display) throw new Error("display phone unavailable")
      return display
    },
    ["linked-whatsapp-phone", phoneNumberId, tokenHash],
    { revalidate: 3600 },
  )

  try {
    return await load()
  } catch {
    return null
  }
}
