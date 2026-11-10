import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { safeNext } from "@/lib/utils"

export const dynamic = "force-dynamic"

// مسار الـ Callback لتسجيل الدخول عبر جوجل (OAuth عبر Supabase):
// يستبدل الكود بجلسة، ثم ينشئ ملف المستخدم إن كان البريد جديداً، ويحوّل إلى الصفحة الرئيسية.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = safeNext(searchParams.get("next") || undefined)
  const fail = (reason: string) => {
    const url = new URL("/auth/login", origin)
    url.searchParams.set("error", reason)
    if (next) url.searchParams.set("next", next)
    return NextResponse.redirect(url)
  }

  // ربط حساب جوجل من صفحة الملف الشخصي: النتيجة تُعاد إلى نفس الصفحة بدلاً من صفحة الدخول.
  const isLink = searchParams.get("link") === "google"
  const linkResult = (status: string) => {
    const url = new URL(next || "/dashboard/profile", origin)
    url.searchParams.set("google_link", status)
    return NextResponse.redirect(url)
  }

  if (searchParams.get("error")) {
    const detail = `${searchParams.get("error_code") || ""} ${searchParams.get("error_description") || searchParams.get("error")}`
    console.error("[auth/callback] Provider error:", detail)
    if (isLink) {
      const d = detail.toLowerCase()
      if (d.includes("identity_already_exists") || d.includes("already linked")) return linkResult("exists")
      if (d.includes("manual_linking") || d.includes("manual linking")) return linkResult("disabled")
      return linkResult("failed")
    }
    return fail("oauth")
  }
  if (!code) return isLink ? linkResult("failed") : fail("oauth")

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    console.error("[auth/callback] Code exchange failed:", error?.message)
    return isLink ? linkResult("failed") : fail("oauth")
  }

  // في حالة الربط الحساب موجود مسبقاً، فلا نغيّر ملف المستخدم أو حالته.
  if (isLink) return linkResult("success")

  const user = data.user
  const email = user.email?.trim().toLowerCase() || ""
  const meta = (user.user_metadata || {}) as Record<string, string | undefined>
  const fullName = (meta.full_name || meta.name || email.split("@")[0] || "").trim()

  try {
    const admin = createAdminClient()
    const { data: profile } = await admin.from("user_profiles").select("id, email").eq("id", user.id).maybeSingle()

    // البريد جديد: إنشاء ملف المستخدم بنفس إعدادات التسجيل العادي (الحساب مؤكد مباشرة من جوجل).
    // ملاحظة: الـ trigger في Supabase يُنشئ صفاً بدون بريد (والدور يأخذ القيمة الافتراضية "user")،
    // لذا أي صف بدون بريد يُعامل كحساب جديد ويُضبط غير نشط افتراضياً.
    // نتحقق أيضاً أن حساب المصادقة أُنشئ للتو حتى لا نعيد ضبط حسابات قديمة ينقصها البريد في الملف.
    const justCreated = Date.now() - new Date(user.created_at).getTime() < 10 * 60 * 1000
    if (!profile || (!profile.email && justCreated)) {
      const { error: profileError } = await admin.from("user_profiles").upsert(
        {
          id: user.id,
          full_name: fullName,
          phone_number: meta.phone_number || "",
          email,
          role: "user",
          is_active: false,
          account_status: "suspended",
          account_active_until: null,
        },
        { onConflict: "id" },
      )
      if (profileError) {
        console.error("[auth/callback] Profile setup failed:", profileError)
        await supabase.auth.signOut()
        return fail("profile")
      }
      const { error: settingsError } = await admin
        .from("user_settings")
        .upsert({ user_id: user.id, notification_email: email }, { onConflict: "user_id", ignoreDuplicates: true })
      if (settingsError) console.error("[auth/callback] Settings error:", settingsError)
    }
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err)
    await supabase.auth.signOut()
    return fail("profile")
  }

  // بعد نجاح الدخول عبر جوجل يُحوَّل المستخدم إلى الصفحة الرئيسية (أو إلى الصفحة المحمية التي جاء منها).
  return NextResponse.redirect(new URL(next || "/", origin))
}
