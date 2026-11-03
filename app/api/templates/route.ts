import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { GRAPH_API_VERSION, getMetaConfig } from "@/lib/meta"
import { toMetaComponents, validateTemplate, type TemplateDraft } from "@/lib/template-rules"

const GRAPH = `https://graph.facebook.com/${GRAPH_API_VERSION}`

function cleanToken(token: string) {
  return token
    .replace(/[   -   　]/g, "")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, "")
    .trim()
}

/** يتحقق من صلاحية المستخدم ويعيد بيانات واتساب الخاصة بالحساب (من الخادم فقط). */
async function getAccount(userId: string | null) {
  const viewer = await getSessionUser()
  if (!viewer) return { error: NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 }) }
  if (!userId || (viewer.id !== userId && viewer.role !== "admin")) {
    return { error: NextResponse.json({ error: "غير مصرح" }, { status: 403 }) }
  }
  const { data } = await createAdminClient()
    .from("user_profiles")
    .select("whatsapp_access_token, whatsapp_business_account_id")
    .eq("id", userId)
    .single()
  if (!data?.whatsapp_access_token || !data.whatsapp_business_account_id) {
    return { error: NextResponse.json({ error: "يرجى ربط حساب واتساب من الإعدادات أولاً" }, { status: 400 }) }
  }
  return { token: cleanToken(data.whatsapp_access_token), wabaId: String(data.whatsapp_business_account_id) }
}

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")
  const account = await getAccount(userId)
  if ("error" in account) return account.error
  const res = await fetch(
    `${GRAPH}/${account.wabaId}/message_templates?limit=200&fields=id,name,language,status,category,components,rejected_reason,quality_score`,
    { headers: { Authorization: `Bearer ${account.token}` }, cache: "no-store" },
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return NextResponse.json({ error: json.error?.message || "فشل جلب القوالب" }, { status: 400 })
  return NextResponse.json({ templates: json.data || [] })
}

/**
 * يرفع ملف مثال الترويسة عبر Resumable Upload API ويعيد header_handle المطلوب لإنشاء القالب.
 * الرفع يجب أن يتم على تطبيق Meta المالك لرمز الوصول.
 */
async function uploadHeaderSample(token: string, file: File) {
  const appRes = await fetch(`${GRAPH}/app`, { headers: { Authorization: `Bearer ${token}` } })
  const appJson = await appRes.json().catch(() => ({}))
  const appId = appJson.id || getMetaConfig().appId
  if (!appId) throw new Error("تعذر تحديد تطبيق Meta المرتبط برمز الوصول")

  const params = new URLSearchParams({ file_name: file.name, file_length: String(file.size), file_type: file.type })
  const sessionRes = await fetch(`${GRAPH}/${appId}/uploads?${params}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
  const session = await sessionRes.json().catch(() => ({}))
  if (!sessionRes.ok || !session.id) throw new Error(session.error?.message || "فشل بدء رفع ملف الترويسة")

  const uploadRes = await fetch(`${GRAPH}/${session.id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${token}`, file_offset: "0" },
    body: Buffer.from(await file.arrayBuffer()),
  })
  const upload = await uploadRes.json().catch(() => ({}))
  if (!uploadRes.ok || !upload.h) throw new Error(upload.error?.message || "فشل رفع ملف الترويسة")
  return upload.h as string
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  const account = await getAccount(String(form.get("userId") || ""))
  if ("error" in account) return account.error

  let draft: TemplateDraft
  try {
    draft = JSON.parse(String(form.get("draft") || ""))
  } catch {
    return NextResponse.json({ error: "بيانات القالب غير صالحة" }, { status: 400 })
  }
  const file = form.get("file")
  const media = file instanceof File && file.size > 0 ? file : null

  const errors = validateTemplate(draft, media ? { type: media.type, size: media.size } : null)
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 })

  try {
    const handle = draft.headerFormat !== "NONE" && draft.headerFormat !== "TEXT" && media ? await uploadHeaderSample(account.token, media) : undefined
    const res = await fetch(`${GRAPH}/${account.wabaId}/message_templates`, {
      method: "POST",
      headers: { Authorization: `Bearer ${account.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        language: draft.language,
        category: draft.category,
        components: toMetaComponents(draft, handle),
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = json.error?.error_user_msg || json.error?.message || "رفضت Meta إنشاء القالب"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ id: json.id, status: json.status, category: json.category })
  } catch (error) {
    console.error("[templates] create failed:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر إنشاء القالب" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const account = await getAccount(url.searchParams.get("userId"))
  if ("error" in account) return account.error
  const name = url.searchParams.get("name") || ""
  if (!/^[a-z0-9_]+$/.test(name)) return NextResponse.json({ error: "اسم القالب غير صالح" }, { status: 400 })
  const res = await fetch(`${GRAPH}/${account.wabaId}/message_templates?name=${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${account.token}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return NextResponse.json({ error: json.error?.message || "فشل حذف القالب" }, { status: 400 })
  return NextResponse.json({ success: true })
}
