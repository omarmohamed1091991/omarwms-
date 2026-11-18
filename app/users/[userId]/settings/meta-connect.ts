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

type PhoneInfo = {
  id: string
  display_phone_number?: string
  verified_name?: string
  quality_rating?: string
  code_verification_status?: string
}

function graphError(data: any, fallback = "خطأ غير معروف") {
  return data?.error?.error_user_msg || data?.error?.message || fallback
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
    const accessToken: string | undefined = tokenRes.data?.access_token?.trim()
    if (!tokenRes.ok || !accessToken) {
      return {
        success: false as const,
        error: "فشل الحصول على رمز الوصول من Meta: " + graphError(tokenRes.data),
      }
    }

    // 2) تحديد حساب واتساب للأعمال (WABA): نعتمد ما أرسلته نافذة Meta، ونتحقق منه مقابل الصلاحيات الممنوحة
    const grantedWabaIds = await findWabaIds(accessToken, config.appId, config.appSecret)
    let wabaId = input.wabaId?.trim() || ""
    if (!wabaId || (grantedWabaIds.length > 0 && !grantedWabaIds.includes(wabaId))) {
      wabaId = grantedWabaIds[0] || wabaId
    }
    if (!wabaId) {
      return { success: false as const, error: "لم يتم العثور على حساب واتساب للأعمال. أعد المحاولة وأكمل جميع خطوات نافذة Meta" }
    }

    const waba = await graph(`/${wabaId}?fields=id,name,currency,timezone_id`, { token: accessToken })
    if (!waba.ok || !waba.data?.id) {
      return {
        success: false as const,
        error: "تعذّر الوصول إلى حساب واتساب للأعمال بالرمز الجديد: " + graphError(waba.data),
      }
    }

    // 3) تحديد معرّف رقم الهاتف من أرقام الحساب نفسه
    const phones = await graph(
      `/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`,
      { token: accessToken },
    )
    const list: PhoneInfo[] = phones.data?.data || []
    let phoneNumberId = input.phoneNumberId?.trim() || ""
    if (!phoneNumberId || (list.length > 0 && !list.some((p) => p.id === phoneNumberId))) {
      phoneNumberId = list[0]?.id || phoneNumberId
    }
    if (!phoneNumberId) {
      return { success: false as const, error: "لم يتم العثور على رقم هاتف في حساب واتساب للأعمال" }
    }

    // 4) اختبار الاتصال الفعلي برقم الهاتف قبل الحفظ
    const phone = await graph(
      `/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`,
      { token: accessToken },
    )
    if (!phone.ok || !phone.data?.id) {
      return {
        success: false as const,
        error: "تعذّر الاتصال برقم الهاتف عبر WhatsApp Cloud API: " + graphError(phone.data),
      }
    }
    const phoneInfo: PhoneInfo = phone.data

    // 5) تسجيل الرقم على WhatsApp Cloud API (يُعتبر ناجحاً إن كان مسجلاً مسبقاً)
    const pin = String(randomInt(100000, 1000000))
    const register = await graph(`/${phoneNumberId}/register`, {
      method: "POST",
      token: accessToken,
      body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    })
    const registerMessage: string = register.data?.error?.message || ""
    const alreadyRegistered = !register.ok && /already|registered/i.test(registerMessage)

    // 6) حفظ رمز التحقق أولاً لأن Meta تتحقق من الـ Webhook فور طلب الاشتراك
    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("whatsapp_webhook_verify_token")
      .eq("id", userId)
      .single()
    const verifyToken =
      existing?.whatsapp_webhook_verify_token || "whatsapp_verify_" + randomBytes(12).toString("hex")
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

    // التأكد من أن التطبيق مشترك فعلاً في أحداث الحساب
    const subscribed = await graph(`/${wabaId}/subscribed_apps`, { token: accessToken })
    const webhookSubscribed =
      webhook.ok ||
      (subscribed.ok &&
        (subscribed.data?.data || []).some(
          (a: any) => String(a?.whatsapp_business_api_data?.id || a?.id || "") === String(config.appId),
        ))

    // 7) استبدال جميع القيم القديمة بالقيم الجديدة القادمة من Meta
    const newValues = {
      whatsapp_business_account_id: String(wabaId),
      whatsapp_phone_number_id: String(phoneNumberId),
      whatsapp_access_token: accessToken,
      whatsapp_webhook_verify_token: verifyToken,
      whatsapp_connection_status: "connected",
      updated_at: new Date().toISOString(),
    }
    const { data: saved, error } = await supabase
      .from("user_profiles")
      .update(newValues)
      .eq("id", userId)
      .select("whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_connection_status")
      .single()
    if (error || !saved) {
      return { success: false as const, error: "فشل حفظ بيانات الربط: " + (error?.message || "لم يتم العثور على الحساب") }
    }
    if (
      String(saved.whatsapp_business_account_id) !== newValues.whatsapp_business_account_id ||
      String(saved.whatsapp_phone_number_id) !== newValues.whatsapp_phone_number_id ||
      saved.whatsapp_access_token !== accessToken ||
      saved.whatsapp_connection_status !== "connected"
    ) {
      return { success: false as const, error: "لم يتم حفظ بيانات الربط بشكل صحيح، أعد المحاولة" }
    }

    // الرقم أصبح مرتبطاً بهذا الحساب فقط، فنفصله عن أي حساب آخر كان يستخدمه حتى لا تذهب رسائله لغير صاحبه
    await supabase
      .from("user_profiles")
      .update({
        whatsapp_phone_number_id: null,
        whatsapp_access_token: null,
        whatsapp_connection_status: "disconnected",
        updated_at: new Date().toISOString(),
      })
      .eq("whatsapp_phone_number_id", newValues.whatsapp_phone_number_id)
      .neq("id", userId)

    revalidatePath(`/users/${userId}`, "layout")

    const registered = register.ok || alreadyRegistered
    return {
      success: true as const,
      wabaId: newValues.whatsapp_business_account_id,
      wabaName: (waba.data?.name as string) || "",
      phoneNumberId: newValues.whatsapp_phone_number_id,
      displayPhone: phoneInfo.display_phone_number || list.find((p) => p.id === phoneNumberId)?.display_phone_number || "",
      verifiedName: phoneInfo.verified_name || "",
      qualityRating: phoneInfo.quality_rating || "",
      webhookUrl,
      webhookSubscribed,
      webhookOverride,
      registered,
      // يُعرض مرة واحدة فقط ليحتفظ به المستخدم (رمز التحقق بخطوتين للرقم)
      pin: register.ok ? pin : null,
      registerError: registered ? null : registerMessage || null,
    }
  } catch (error: any) {
    console.error("[meta-connect] Embedded signup failed:", error?.message)
    return { success: false as const, error: error?.message || "حدث خطأ غير متوقع" }
  }
}

// اختبار الاتصال بالبيانات المحفوظة على الخادم وتحديث حالة الاتصال
export async function verifySavedWhatsAppConnection(userId: string) {
  try {
    await assertAccess(userId)
    const supabase = createAdminClient()
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("whatsapp_access_token, whatsapp_business_account_id, whatsapp_phone_number_id")
      .eq("id", userId)
      .single()
    const token = (profile?.whatsapp_access_token || "").replace(/\s+/g, "")
    if (!token || !profile?.whatsapp_business_account_id || !profile?.whatsapp_phone_number_id) {
      return { success: false as const, error: "بيانات الربط غير مكتملة" }
    }
    const [waba, phone] = await Promise.all([
      graph(`/${profile.whatsapp_business_account_id}?fields=id,name`, { token }),
      graph(`/${profile.whatsapp_phone_number_id}?fields=id,display_phone_number,verified_name`, { token }),
    ])
    const ok = waba.ok && !!waba.data?.id && phone.ok && !!phone.data?.id
    await supabase
      .from("user_profiles")
      .update({ whatsapp_connection_status: ok ? "connected" : "disconnected", updated_at: new Date().toISOString() })
      .eq("id", userId)
    if (!ok) {
      return {
        success: false as const,
        error: "فشل الاتصال: " + graphError(!waba.ok ? waba.data : phone.data),
        code: (!waba.ok ? waba.data : phone.data)?.error?.code as number | undefined,
      }
    }
    return {
      success: true as const,
      displayPhone: (phone.data?.display_phone_number as string) || "",
      verifiedName: (phone.data?.verified_name as string) || "",
    }
  } catch (error: any) {
    return { success: false as const, error: error?.message || "حدث خطأ غير متوقع" }
  }
}
