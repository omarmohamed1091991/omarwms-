"use server"

import { randomBytes, randomInt } from "crypto"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMetaConfig, GRAPH_API_VERSION } from "@/lib/meta"

const GRAPH = `https://graph.facebook.com/${GRAPH_API_VERSION}`

async function assertAccess(userId: string) {
  const viewer = await getSessionUser()
  if (!viewer || (viewer.id !== userId && viewer.role !== "admin")) throw new Error("غير مصرح")
  return viewer
}

async function graph(path: string, init?: RequestInit & { token?: string }) {
  const { token, ...rest } = init || {}
  const res = await fetch(`${GRAPH}${path}`, {
    ...rest,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok && !data?.error, data }
}

function siteUrl() {
  return (process.env.URL || "https://owms.site").replace(/\/$/, "")
}

// يستخرج معرّفات حسابات واتساب للأعمال التي منح المستخدم الصلاحية عليها
async function findWabaIds(token: string, appId: string, appSecret: string) {
  const { data } = await graph(
    `/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
  )
  const scopes: { scope: string; target_ids?: string[] }[] = data?.data?.granular_scopes || []
  const ids = new Set<string>()
  for (const s of scopes) {
    if (s.scope === "whatsapp_business_management" || s.scope === "whatsapp_business_messaging") {
      s.target_ids?.forEach((id) => ids.add(id))
    }
  }
  return [...ids]
}

export async function completeMetaEmbeddedSignup(
  userId: string,
  input: { code: string; wabaId?: string | null; phoneNumberId?: string | null },
) {
  try {
    await assertAccess(userId)
    const config = getMetaConfig()
    if (!config.appSecret || !config.appId) {
      return { success: false as const, error: "الربط التلقائي غير مفعّل على المنصة بعد (إعدادات تطبيق Meta ناقصة)" }
    }
    if (!input.code) return { success: false as const, error: "لم يتم استلام رمز التفويض من Meta" }

    // 1) استبدال رمز التفويض برمز وصول للأعمال
    const tokenRes = await graph(
      `/oauth/access_token?client_id=${config.appId}&client_secret=${encodeURIComponent(config.appSecret)}&code=${encodeURIComponent(input.code)}`,
    )
    const accessToken: string | undefined = tokenRes.data?.access_token
    if (!tokenRes.ok || !accessToken) {
      return {
        success: false as const,
        error: "فشل الحصول على رمز الوصول من Meta: " + (tokenRes.data?.error?.message || "خطأ غير معروف"),
      }
    }

    // 2) تحديد حساب واتساب للأعمال (WABA)
    let wabaId = input.wabaId?.trim() || ""
    if (!wabaId) {
      const ids = await findWabaIds(accessToken, config.appId, config.appSecret)
      wabaId = ids[0] || ""
    }
    if (!wabaId) {
      return { success: false as const, error: "لم يتم العثور على حساب واتساب للأعمال. أعد المحاولة وأكمل جميع خطوات نافذة Meta" }
    }

    // 3) تحديد معرّف رقم الهاتف
    let phoneNumberId = input.phoneNumberId?.trim() || ""
    let displayPhone = ""
    const phones = await graph(`/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`, {
      token: accessToken,
    })
    const list: { id: string; display_phone_number?: string }[] = phones.data?.data || []
    if (!phoneNumberId) phoneNumberId = list[0]?.id || ""
    displayPhone = list.find((p) => p.id === phoneNumberId)?.display_phone_number || ""
    if (!phoneNumberId) {
      return { success: false as const, error: "لم يتم العثور على رقم هاتف في حساب واتساب للأعمال" }
    }

    // 4) تسجيل الرقم على WhatsApp Cloud API (يُتجاهل إن كان مسجلاً مسبقاً)
    const pin = String(randomInt(100000, 1000000))
    const register = await graph(`/${phoneNumberId}/register`, {
      method: "POST",
      token: accessToken,
      body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    })

    // 5) ربط الـ Webhook الخاص بالمستخدم بحساب واتساب
    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("whatsapp_webhook_verify_token")
      .eq("id", userId)
      .single()
    const verifyToken =
      existing?.whatsapp_webhook_verify_token || "whatsapp_verify_" + randomBytes(12).toString("hex")

    // نحفظ رمز التحقق أولاً لأن Meta تتحقق من الـ Webhook فور طلب الاشتراك
    await supabase.from("user_profiles").update({ whatsapp_webhook_verify_token: verifyToken }).eq("id", userId)

    const webhookUrl = `${siteUrl()}/api/webhooks/${userId}`
    let webhook = await graph(`/${wabaId}/subscribed_apps`, {
      method: "POST",
      token: accessToken,
      body: JSON.stringify({ override_callback_uri: webhookUrl, verify_token: verifyToken }),
    })
    let webhookOverride = webhook.ok
    if (!webhook.ok) {
      // في حال رفض التخصيص، نشترك على الأقل برابط الـ Webhook الافتراضي للتطبيق
      webhook = await graph(`/${wabaId}/subscribed_apps`, { method: "POST", token: accessToken })
      webhookOverride = false
    }

    // 6) حفظ البيانات وربطها بالمستخدم
    const { error } = await supabase
      .from("user_profiles")
      .update({
        whatsapp_business_account_id: wabaId,
        whatsapp_phone_number_id: phoneNumberId,
        whatsapp_access_token: accessToken,
        whatsapp_webhook_verify_token: verifyToken,
        whatsapp_connection_status: "connected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
    if (error) return { success: false as const, error: "فشل حفظ بيانات الربط: " + error.message }

    revalidatePath(`/users/${userId}/settings`)

    return {
      success: true as const,
      wabaId,
      phoneNumberId,
      displayPhone,
      webhookUrl,
      webhookSubscribed: webhook.ok,
      webhookOverride,
      registered: register.ok,
      // يُعرض مرة واحدة فقط ليحتفظ به المستخدم (رمز التحقق بخطوتين للرقم)
      pin: register.ok ? pin : null,
      registerError: register.ok ? null : register.data?.error?.message || null,
    }
  } catch (error: any) {
    console.error("[meta-connect] Embedded signup failed:", error?.message)
    return { success: false as const, error: error?.message || "حدث خطأ غير متوقع" }
  }
}
