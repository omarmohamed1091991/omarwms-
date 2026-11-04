"use server"

import { eq } from "drizzle-orm"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { db } from "@/db"
import { DELETE_CONFIRMATION_TEXT } from "@/lib/account"
import { appointmentMessages, appointmentTemplates, paymobSessions, subscriptions } from "@/db/schema"


// يحذف حساب المستخدم الحالي وكل بياناته نهائياً.
// سجلات المدفوعات (الفواتير) تُحفظ فقط لأنها مطلوبة قانونياً، ولا تحتوي إلا على معرّف المستخدم والمبالغ.
export async function deleteMyAccount(confirmation: string) {
  try {
    if (confirmation.trim() !== DELETE_CONFIRMATION_TEXT) {
      return { success: false, error: `اكتب "${DELETE_CONFIRMATION_TEXT}" للتأكيد` }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "المستخدم غير مسجل دخول" }

    const admin = createAdminClient()
    const { data: profile } = await admin.from("user_profiles").select("role").eq("id", user.id).single()
    if (profile?.role === "admin") {
      return { success: false, error: "لا يمكن حذف حساب المدير من هنا. تواصل مع الدعم الفني." }
    }

    const userId = user.id

    // بيانات المنصة في Netlify Database
    await db.delete(appointmentMessages).where(eq(appointmentMessages.userId, userId))
    await db.delete(appointmentTemplates).where(eq(appointmentTemplates.userId, userId))
    await db.delete(paymobSessions).where(eq(paymobSessions.userId, userId))
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId))

    // بيانات Supabase (الرسائل، جهات الاتصال، الوسائط، الإعدادات، رموز ربط واتساب)
    const { data: campaigns } = await admin.from("bulk_messages").select("id").eq("user_id", userId)
    const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id)
    if (campaignIds.length) {
      await admin.from("bulk_message_recipients").delete().in("bulk_message_id", campaignIds)
    }
    for (const table of ["bulk_messages", "individual_messages", "incoming_messages", "media_library", "user_settings"]) {
      const { error } = await admin.from(table).delete().eq("user_id", userId)
      if (error) console.error(`[account] delete ${table} error:`, error.message)
    }
    await admin.from("user_profiles").delete().eq("id", userId)

    // حذف حساب الدخول نفسه
    const { error: authError } = await admin.auth.admin.deleteUser(userId)
    if (authError) {
      console.error("[account] delete auth user error:", authError.message)
      return { success: false, error: "تعذر حذف الحساب. حاول مرة أخرى أو تواصل مع الدعم." }
    }

    await supabase.auth.signOut().catch(() => {})
    return { success: true }
  } catch (error: any) {
    console.error("[account] delete account error:", error)
    return { success: false, error: "حدث خطأ غير متوقع أثناء حذف الحساب" }
  }
}
