"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { appointmentMessages, appointmentTemplates } from "@/db/schema"
import { getSessionUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { extractMetaPlaceholders, renderAppointmentMessage, type AppointmentValues } from "@/lib/appointments"

async function assertAccess(userId: string) {
  const viewer = await getSessionUser()
  if (!viewer || (viewer.id !== userId && viewer.role !== "admin")) throw new Error("غير مصرح")
  return viewer
}

function cleanToken(token: string) {
  return token
    .replace(/[   -   　]/g, "")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, "")
    .trim()
}

async function getWhatsAppProfile(userId: string) {
  const { data } = await createAdminClient()
    .from("user_profiles")
    .select("whatsapp_access_token, whatsapp_phone_number_id, whatsapp_business_account_id, account_status, account_active_until, is_active")
    .eq("id", userId)
    .single()
  return data
}

export async function listAppointmentTemplates(userId: string) {
  await assertAccess(userId)
  return db
    .select()
    .from(appointmentTemplates)
    .where(eq(appointmentTemplates.userId, userId))
    .orderBy(desc(appointmentTemplates.isDefault), desc(appointmentTemplates.updatedAt))
}

export async function saveAppointmentTemplate(
  userId: string,
  input: {
    id?: number
    name: string
    body: string
    metaTemplateName?: string | null
    metaLanguage?: string | null
    paramMap?: Record<string, string>
    isDefault?: boolean
  },
) {
  await assertAccess(userId)
  const name = input.name.trim()
  const body = input.body.trim()
  if (!name || !body) return { success: false as const, error: "يرجى إدخال اسم القالب ونص الرسالة" }

  const metaTemplateName = input.metaTemplateName?.trim() || null
  const placeholders = metaTemplateName ? extractMetaPlaceholders(body) : []
  const paramMap = Object.fromEntries(placeholders.map((p) => [p, input.paramMap?.[p] ?? ""]))
  if (metaTemplateName && placeholders.some((p) => !paramMap[p])) {
    return { success: false as const, error: "يرجى تحديد قيمة لكل متغير في قالب واتساب" }
  }

  if (input.isDefault) {
    await db.update(appointmentTemplates).set({ isDefault: false }).where(eq(appointmentTemplates.userId, userId))
  }
  const values = {
    name,
    body,
    metaTemplateName,
    metaLanguage: metaTemplateName ? input.metaLanguage || "ar" : null,
    paramMap,
    isDefault: !!input.isDefault,
    updatedAt: new Date(),
  }
  const [row] = input.id
    ? await db
        .update(appointmentTemplates)
        .set(values)
        .where(and(eq(appointmentTemplates.id, input.id), eq(appointmentTemplates.userId, userId)))
        .returning()
    : await db
        .insert(appointmentTemplates)
        .values({ ...values, userId })
        .returning()
  revalidatePath(`/users/${userId}/appointments`)
  return row ? { success: true as const, template: row } : { success: false as const, error: "القالب غير موجود" }
}

export async function deleteAppointmentTemplate(userId: string, id: number) {
  await assertAccess(userId)
  await db.delete(appointmentTemplates).where(and(eq(appointmentTemplates.id, id), eq(appointmentTemplates.userId, userId)))
  revalidatePath(`/users/${userId}/appointments`)
  return { success: true as const }
}

export type MetaTemplateSummary = { name: string; language: string; status: string; body: string; hasMediaHeader: boolean }

/** يجلب قوالب واتساب المعتمدة من حساب Meta الخاص بالمستخدم (من الخادم حتى لا يظهر رمز الوصول في المتصفح). */
export async function fetchMetaTemplates(userId: string) {
  await assertAccess(userId)
  const profile = await getWhatsAppProfile(userId)
  if (!profile?.whatsapp_access_token || !profile.whatsapp_business_account_id) {
    return { success: false as const, error: "يرجى إعداد WhatsApp API في الإعدادات أولاً" }
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${profile.whatsapp_business_account_id}/message_templates?limit=200&fields=name,language,status,components`,
      { headers: { Authorization: `Bearer ${cleanToken(profile.whatsapp_access_token)}` }, cache: "no-store" },
    )
    const json = await res.json()
    if (!res.ok || !Array.isArray(json.data)) {
      return { success: false as const, error: json.error?.message || "فشل جلب القوالب من واتساب" }
    }
    const templates: MetaTemplateSummary[] = json.data.map((t: any) => {
      const body = t.components?.find((c: any) => c.type?.toUpperCase() === "BODY")
      const header = t.components?.find((c: any) => c.type?.toUpperCase() === "HEADER")
      return {
        name: t.name,
        language: t.language,
        status: t.status,
        body: body?.text || "",
        hasMediaHeader: !!header && header.format && header.format !== "TEXT",
      }
    })
    return { success: true as const, templates }
  } catch (error) {
    console.error("[appointments] fetchMetaTemplates failed:", error)
    return { success: false as const, error: "تعذّر الاتصال بواتساب" }
  }
}

export async function listAppointmentMessages(userId: string) {
  await assertAccess(userId)
  return db
    .select()
    .from(appointmentMessages)
    .where(eq(appointmentMessages.userId, userId))
    .orderBy(desc(appointmentMessages.createdAt))
    .limit(50)
}

export async function sendAppointmentConfirmation(
  userId: string,
  input: { templateId?: number | null; body: string; phone: string; values: AppointmentValues },
) {
  await assertAccess(userId)
  const profile = await getWhatsAppProfile(userId)
  const expired = profile?.account_active_until && new Date(profile.account_active_until) < new Date()
  if (!profile || profile.account_status !== "active" || expired) {
    return { success: false as const, error: "الحساب غير نشط. يرجى تجديد الاشتراك لإرسال الرسائل" }
  }
  if (!profile.whatsapp_access_token || !profile.whatsapp_phone_number_id) {
    return { success: false as const, error: "يرجى إعداد WhatsApp API في الإعدادات أولاً" }
  }
  const phone = input.phone.replace(/\D/g, "")
  if (phone.length < 10) return { success: false as const, error: "رقم الجوال غير صحيح" }
  const values = { ...input.values, phone: input.values.phone || phone }
  if (!values.name.trim() || !values.date.trim() || !values.time.trim()) {
    return { success: false as const, error: "يرجى إدخال الاسم والتاريخ والساعة" }
  }

  const [template] = input.templateId
    ? await db
        .select()
        .from(appointmentTemplates)
        .where(and(eq(appointmentTemplates.id, input.templateId), eq(appointmentTemplates.userId, userId)))
    : []

  let payload: Record<string, unknown>
  let messageText: string
  if (template?.metaTemplateName) {
    // قالب معتمد من Meta: نرسل قيم المتغيرات بالترتيب (أو بالاسم في القوالب ذات المتغيرات المسماة).
    const placeholders = extractMetaPlaceholders(template.body)
    const parameters = placeholders.map((p) => {
      const text = values[template.paramMap[p] as keyof AppointmentValues]?.trim() || "-"
      return /^\d+$/.test(p) ? { type: "text", text } : { type: "text", parameter_name: p, text }
    })
    payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: template.metaTemplateName,
        language: { code: template.metaLanguage || "ar" },
        ...(parameters.length ? { components: [{ type: "body", parameters }] } : {}),
      },
    }
    messageText = renderAppointmentMessage(template.body, values, template.paramMap)
  } else {
    messageText = renderAppointmentMessage(input.body, values)
    if (!messageText.trim()) return { success: false as const, error: "نص الرسالة فارغ" }
    payload = { messaging_product: "whatsapp", recipient_type: "individual", to: phone, type: "text", text: { body: messageText } }
  }

  let whatsappMessageId: string | null = null
  let error: string | null = null
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${profile.whatsapp_phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cleanToken(profile.whatsapp_access_token)}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) error = json.error?.error_user_msg || json.error?.message || "فشل إرسال الرسالة عبر واتساب"
    else whatsappMessageId = json.messages?.[0]?.id ?? null
  } catch (e) {
    console.error("[appointments] send failed:", e)
    error = "تعذّر الاتصال بواتساب"
  }

  const [log] = await db
    .insert(appointmentMessages)
    .values({
      userId,
      templateId: template?.id ?? null,
      patientName: values.name.trim(),
      patientPhone: phone,
      appointmentDate: values.date,
      appointmentTime: values.time,
      doctorName: values.doctor.trim(),
      messageText,
      status: error ? "failed" : "sent",
      error,
      whatsappMessageId,
    })
    .returning()

  if (!error) {
    // نسجّل الرسالة في صندوق الوارد كرسالة صادرة لتظهر ضمن المحادثة مع المريض.
    await createAdminClient()
      .from("incoming_messages")
      .insert({
        user_id: userId,
        sender_phone: phone,
        sender_name: values.name.trim(),
        message_text: messageText,
        direction: "outgoing",
        message_type: "text",
        is_read: true,
        received_at: new Date().toISOString(),
        whatsapp_message_id: whatsappMessageId,
      })
      .then(({ error: inboxError }) => inboxError && console.error("[appointments] inbox log failed:", inboxError))
  }

  return error ? { success: false as const, error, log } : { success: true as const, log }
}
