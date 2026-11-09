import { GRAPH_API_VERSION } from "@/lib/meta"

const GRAPH = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export type QualityRating = "GREEN" | "YELLOW" | "RED" | "UNKNOWN"

export interface MessagingLimitInfo {
  connected: boolean
  /** رسالة خطأ عند تعذر الاتصال بـ Meta */
  error?: string
  /** القيمة الخام كما ترجعها Meta (مثل TIER_1K) */
  tier: string | null
  /** عدد العملاء المسموح بمراسلتهم برسائل قوالب خلال 24 ساعة، null = غير محدود */
  limit: number | null
  /** مصدر الحد: على مستوى المحفظة التجارية أو رقم الهاتف */
  scope: "portfolio" | "phone" | null
  quality: QualityRating
  displayPhoneNumber: string | null
  verifiedName: string | null
  phoneStatus: string | null
  nameStatus: string | null
  throughput: string | null
}

const TIER_LIMITS: Record<string, number | null> = {
  TIER_50: 50,
  TIER_250: 250,
  TIER_1K: 1000,
  TIER_2K: 2000,
  TIER_10K: 10000,
  TIER_100K: 100000,
  TIER_UNLIMITED: null,
  UNLIMITED: null,
}

function parseTier(raw: unknown): { tier: string; limit: number | null } | null {
  if (!raw) return null
  // قد تعيد Meta الحد كنص مباشر أو ككائن يحتوي على الحقل
  const value =
    typeof raw === "string"
      ? raw
      : typeof raw === "object"
        ? String((raw as any).current_limit || (raw as any).tier || (raw as any).messaging_limit_tier || "")
        : ""
  const tier = value.trim().toUpperCase()
  if (!tier) return null
  if (tier in TIER_LIMITS) return { tier, limit: TIER_LIMITS[tier] }
  const match = tier.match(/(\d+)\s*(K)?/)
  if (match) return { tier, limit: Number(match[1]) * (match[2] ? 1000 : 1) }
  return { tier, limit: null }
}

function cleanToken(token: string) {
  return token.replace(/[​-‍﻿]/g, "").replace(/\s+/g, "").trim()
}

async function graphGet(path: string, token: string) {
  const res = await fetch(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, json }
}

const EMPTY: MessagingLimitInfo = {
  connected: false,
  tier: null,
  limit: null,
  scope: null,
  quality: "UNKNOWN",
  displayPhoneNumber: null,
  verifiedName: null,
  phoneStatus: null,
  nameStatus: null,
  throughput: null,
}

/**
 * يجلب حد الإرسال الفعلي للمستخدم من WhatsApp Cloud API.
 * منذ أكتوبر 2025 تحسب Meta الحد على مستوى المحفظة التجارية (Business Portfolio)،
 * لذلك نقرأه أولاً من حساب WABA ثم نرجع إلى حد رقم الهاتف إن لم يتوفر.
 */
export async function getMessagingLimit(account: {
  accessToken: string | null
  phoneNumberId: string | null
  wabaId: string | null
}): Promise<MessagingLimitInfo> {
  if (!account.accessToken || !account.phoneNumberId) return EMPTY
  const token = cleanToken(account.accessToken)

  try {
    const [phone, waba] = await Promise.all([
      graphGet(
        `/${account.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,name_status,throughput`,
        token,
      ),
      account.wabaId
        ? graphGet(`/${account.wabaId}?fields=whatsapp_business_manager_messaging_limit`, token).catch(() => null)
        : Promise.resolve(null),
    ])

    if (!phone.ok) {
      return { ...EMPTY, connected: true, error: phone.json?.error?.message || "تعذر جلب بيانات الرقم من Meta" }
    }

    const p = phone.json || {}
    const portfolioTier = waba?.ok ? parseTier(waba.json?.whatsapp_business_manager_messaging_limit) : null
    const phoneTier = parseTier(p.messaging_limit_tier)
    const chosen = portfolioTier || phoneTier
    const quality = String(p.quality_rating || "UNKNOWN").toUpperCase()

    return {
      connected: true,
      tier: chosen?.tier || null,
      limit: chosen ? chosen.limit : null,
      scope: portfolioTier ? "portfolio" : phoneTier ? "phone" : null,
      quality: (["GREEN", "YELLOW", "RED"].includes(quality) ? quality : "UNKNOWN") as QualityRating,
      displayPhoneNumber: p.display_phone_number || null,
      verifiedName: p.verified_name || null,
      phoneStatus: p.status || null,
      nameStatus: p.name_status || null,
      throughput: p.throughput?.level || null,
    }
  } catch (err: any) {
    return { ...EMPTY, connected: true, error: err?.message || "تعذر الاتصال بـ Meta" }
  }
}
