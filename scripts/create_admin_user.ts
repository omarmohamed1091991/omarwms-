import { createAdminClient } from "@/lib/supabase/admin"

async function createAdminUser() {
  const supabaseAdmin = createAdminClient()

  try {
    // التحقق من وجود حساب أدمن
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const adminExists = existingUsers.users.some((u) => u.email === "admin@rosesmile.com")

    if (adminExists) {
      console.log("✓ Admin user already exists")
      return
    }

    // إنشاء حساب الأدمن
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
      console.error("✗ Failed to create admin:", authError.message)
      return
    }

    // تحديث الملف الشخصي
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        full_name: "المدير العام",
        role: "admin",
        email: "admin@rosesmile.com",
        phone_number: "966500000000",
        is_active: true,
      })
      .eq("id", authData.user.id)

    if (profileError) {
      console.error("✗ Failed to update profile:", profileError.message)
      return
    }

    console.log("✓ Admin user created successfully")
    console.log("  Email: admin@rosesmile.com")
    console.log("  Password: Admin@12345")
  } catch (error: any) {
    console.error("✗ Error:", error.message)
  }
}

createAdminUser()
