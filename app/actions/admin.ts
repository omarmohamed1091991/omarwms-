"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function createAdminUser() {
  try {
    const supabaseAdmin = createAdminClient()

    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const adminExists = existingUser.users.some(
      (u) => u.email === "admin@rosesmile.com" || u.user_metadata?.role === "admin",
    )

    if (adminExists) {
      console.log("[v0] Admin user already exists")
      return { success: true, message: "Admin user already exists" }
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@rosesmile.com",
      password: "Admin@12345",
      email_confirm: true,
      user_metadata: {
        full_name: "المدير العام",
        role: "admin",
      },
    })

    if (authError) {
      console.error("[v0] Admin creation error:", authError)
      return { success: false, error: authError.message }
    }

    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        full_name: "المدير العام",
        role: "admin",
        email: "admin@rosesmile.com",
        is_active: true,
      })
      .eq("id", authData.user.id)

    if (profileError) {
      console.error("[v0] Profile update error:", profileError)
    }

    console.log("[v0] Admin user created successfully")
    return { success: true, userId: authData.user.id }
  } catch (error: any) {
    console.error("[v0] Create admin error:", error)
    return { success: false, error: error.message }
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
