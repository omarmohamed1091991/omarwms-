"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function updateUserProfile(formData: FormData) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] Update profile - Current user:", user?.id)

    if (!user) {
      return { success: false, error: "المستخدم غير مسجل دخول" }
    }

    const full_name = formData.get("full_name") as string
    const phone_number = formData.get("phone_number") as string
    const email = formData.get("email") as string
    const user_id = formData.get("user_id") as string

    console.log("[v0] Update profile data:", { full_name, phone_number, email, user_id })

    const supabaseAdmin = createAdminClient()

    // Check permissions
    const { data: currentUserProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (currentUserProfile?.role !== "admin" && user.id !== user_id) {
      console.log("[v0] Permission denied - user role:", currentUserProfile?.role)
      return { success: false, error: "ليس لديك صلاحية لتحديث هذا المستخدم" }
    }

    // Get current profile to check if email changed
    const { data: targetProfile } = await supabaseAdmin.from("user_profiles").select("email").eq("id", user_id).single()

    console.log("[v0] Target profile current email:", targetProfile?.email)
    console.log("[v0] New email:", email)

    // Update email in Supabase Auth if changed
    if (targetProfile?.email !== email) {
      console.log("[v0] Email changed, updating Auth...")
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        email: email,
        email_confirm: true, // Auto-confirm email to avoid verification
      })

      if (authError) {
        console.error("[v0] Auth email update error:", authError)
        return { success: false, error: `فشل تحديث البريد الإلكتروني: ${authError.message}` }
      }
      console.log("[v0] Auth email updated successfully")
    }

    console.log("[v0] Updating user_profiles table...")
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        full_name,
        phone_number,
        email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id)
      .select()
      .single()

    if (profileError) {
      console.error("[v0] Profile update error:", profileError)
      return { success: false, error: `فشل تحديث الملف الشخصي: ${profileError.message}` }
    }

    console.log("[v0] Profile updated successfully:", updatedProfile)

    revalidatePath(`/users/${user_id}/profile`)
    revalidatePath("/users")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Update profile error:", error)
    return { success: false, error: `حدث خطأ: ${error.message}` }
  }
}

export async function updateUserPassword(targetUserId: string, newPassword: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] Update password - Current user:", user?.id, "Target user:", targetUserId)

    if (!user) {
      return { success: false, error: "المستخدم غير مسجل دخول" }
    }

    const { data: currentUserProfile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (currentUserProfile?.role !== "admin" && user.id !== targetUserId) {
      console.log("[v0] Permission denied - user role:", currentUserProfile?.role)
      return { success: false, error: "ليس لديك صلاحية لتحديث كلمة مرور هذا المستخدم" }
    }

    const supabaseAdmin = createAdminClient()

    console.log("[v0] Updating password in Auth...")
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    })

    if (authError) {
      console.error("[v0] Password update error:", authError)
      return { success: false, error: `فشل تغيير كلمة المرور: ${authError.message}` }
    }

    console.log("[v0] Password updated successfully")

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Update password error:", error)
    return { success: false, error: `حدث خطأ: ${error.message}` }
  }
}
