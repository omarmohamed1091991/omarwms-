"use server"

import { createAdminClient } from "@/lib/supabase/admin"

type RegisterResult = { success: true; userId: string } | { success: false; error: string }

// تسجيل عام لأي زائر: ينشئ الحساب مؤكداً مباشرة (بدون رسالة تفعيل) بنفس طريقة إضافة الأدمن للمستخدم.
export async function registerUser(input: {
  full_name: string
  phone_number: string
  email: string
  password: string
}): Promise<RegisterResult> {
  const full_name = input.full_name?.trim()
  const phone_number = input.phone_number?.trim()
  const email = input.email?.trim().toLowerCase()
  const password = input.password || ""

  if (!full_name || !phone_number || !email || !password) {
    return { success: false, error: "جميع الحقول مطلوبة" }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: "البريد الإلكتروني غير صالح" }
  if (!/^\+?[0-9\s-]{8,20}$/.test(phone_number)) return { success: false, error: "رقم الهاتف غير صالح" }
  if (password.length < 8) return { success: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }

  try {
    const admin = createAdminClient()
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone_number },
    })

    if (authError || !authData.user) {
      const msg = authError?.message || ""
      if (/already|registered|exists/i.test(msg)) {
        return { success: false, error: "هذا البريد مسجل بالفعل، يرجى تسجيل الدخول" }
      }
      console.error("[register] Auth error:", msg)
      return { success: false, error: "تعذر إنشاء الحساب، حاول مرة أخرى" }
    }

    const userId = authData.user.id

    // upsert بدلاً من update حتى يعمل حتى لو لم يُنشئ الـ trigger الصف تلقائياً.
    const { error: profileError } = await admin.from("user_profiles").upsert(
      {
        id: userId,
        full_name,
        phone_number,
        email,
        role: "user",
        // الحساب يبدأ غير نشط حتى يشترك المستخدم أو يجدد اشتراكه.
        is_active: false,
        account_status: "suspended",
        account_active_until: null,
      },
      { onConflict: "id" },
    )
    if (profileError) {
      console.error("[register] Profile error:", profileError)
      await admin.auth.admin.deleteUser(userId)
      return { success: false, error: "تعذر تجهيز حساب المستخدم، حاول مرة أخرى" }
    }

    const { error: settingsError } = await admin
      .from("user_settings")
      .upsert({ user_id: userId, notification_email: email }, { onConflict: "user_id", ignoreDuplicates: true })
    if (settingsError) console.error("[register] Settings error:", settingsError)

    return { success: true, userId }
  } catch (error) {
    console.error("[register] Unexpected error:", error)
    return { success: false, error: "حدث خطأ غير متوقع، حاول مرة أخرى" }
  }
}
