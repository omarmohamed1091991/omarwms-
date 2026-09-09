// سكريبت لإنشاء حساب الأدمن
// تشغيل: node scripts/setup_admin.ts

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createAdminAccount() {
  console.log("🚀 بدء إنشاء حساب الأدمن...")

  try {
    // إنشاء المستخدم في Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: "admin@rosesmile.com",
      password: "Admin@12345",
      email_confirm: true,
      user_metadata: {
        full_name: "مدير النظام",
        role: "admin",
      },
    })

    if (authError) {
      console.error("❌ خطأ في إنشاء المستخدم:", authError.message)
      return
    }

    console.log("✅ تم إنشاء المستخدم في Auth بنجاح:", authData.user?.id)

    // إنشاء أو تحديث الملف الشخصي
    const { error: profileError } = await supabase.from("user_profiles").upsert({
      id: authData.user!.id,
      email: "admin@rosesmile.com",
      full_name: "مدير النظام",
      phone_number: "+966500000000",
      role: "admin",
    })

    if (profileError) {
      console.error("❌ خطأ في إنشاء الملف الشخصي:", profileError.message)
      return
    }

    console.log("✅ تم إنشاء الملف الشخصي بنجاح")
    console.log("\n📧 بيانات تسجيل الدخول:")
    console.log("البريد الإلكتروني: admin@rosesmile.com")
    console.log("كلمة المرور: Admin@12345")
    console.log("\n✨ يمكنك الآن تسجيل الدخول!")
  } catch (error: any) {
    console.error("❌ خطأ غير متوقع:", error.message)
  }
}

createAdminAccount()
