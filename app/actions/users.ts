"use server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function createUser(formData: FormData) {
  try {
    const supabaseAdmin = createAdminClient()

    const full_name = formData.get("full_name") as string
    const phone_number = formData.get("phone_number") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const whatsapp_instance_id = formData.get("whatsapp_instance_id") as string | null
    const whatsapp_token = formData.get("whatsapp_token") as string | null

    console.log("[v0] Server Action: Creating user", { full_name, phone_number, email, password })

    if (!full_name || !phone_number || !email || !password) {
      return { success: false, error: "جميع الحقول مطلوبة" }
    }

    if (password.length < 8) {
      return { success: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone_number,
      },
    })

    if (authError) {
      console.error("[v0] Auth error:", authError)
      const errorMessage =
        authError.message === "fetch failed"
          ? "تعذر الاتصال بخدمة Supabase. تحقق من اتصال قاعدة البيانات ثم أعد المحاولة."
          : `فشل إنشاء حساب المستخدم: ${authError.message}`
      return { success: false, error: errorMessage }
    }

    console.log("[v0] User created in auth:", authData.user.id)

    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        full_name,
        phone_number,
        email: email,
        whatsapp_instance_id: whatsapp_instance_id || null,
        whatsapp_token: whatsapp_token || null,
        role: "user",
        is_active: true,
      })
      .eq("id", authData.user.id)

    if (profileError) {
      console.error("[v0] Profile update error:", profileError)
    } else {
      console.log("[v0] User profile updated successfully")
    }

    revalidatePath("/users")

    return { success: true, userId: authData.user.id }
  } catch (error: any) {
    console.error("[v0] Create user error:", error)
    return { success: false, error: `حدث خطأ غير متوقع: ${error.message}` }
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabaseAdmin = createAdminClient()

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("[v0] Delete auth error:", authError)
      return { success: false, error: "فشل حذف حساب المستخدم" }
    }

    revalidatePath("/users")
    return { success: true }
  } catch (error) {
    console.error("[v0] Delete user error:", error)
    return { success: false, error: "حدث خطأ غير متوقع" }
  }
}

export async function updateUserRole(userId: string, role: "admin" | "user") {
  try {
    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin.from("user_profiles").update({ role }).eq("id", userId)

    if (error) {
      console.error("[v0] Role update error:", error)
      return { success: false, error: "فشل تحديث الصلاحيات" }
    }

    revalidatePath("/users")
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Update role error:", error)
    return { success: false, error: "حدث خطأ غير متوقع" }
  }
}
