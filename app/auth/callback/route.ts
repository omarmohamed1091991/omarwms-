import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { safeNext } from "@/lib/utils"

export const dynamic = "force-dynamic"

// مسار الـ Callback لتسجيل الدخول عبر جوجل (OAuth عبر Supabase):
// يستبدل الكود بجلسة، ثم ينشئ ملف المستخدم إن كان البريد جديداً، ويحوّل إلى لوحة التحكم.
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

  if (searchParams.get("error")) {
    console.error("[auth/callback] Provider error:", searchParams.get("error_description") || searchParams.get("error"))
    return fail("oauth")
  }
  if (!code) return fail("oauth")

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    console.error("[auth/callback] Code exchange failed:", error?.message)
    return fail("oauth")
  }

  const user = data.user
  const email = user.email?.trim().toLowerCase() || ""
  const meta = (user.user_metadata || {}) as Record<string, string | undefined>
  const fullName = (meta.full_name || meta.name || email.split("@")[0] || "").trim()

  let role: string | null = null
  try {
    const admin = createAdminClient()
    const { data: profile } = await admin.from("user_profiles").select("id, role, email").eq("id", user.id).maybeSingle()

    // البريد جديد: إنشاء ملف المستخدم بنفس إعدادات التسجيل العادي (الحساب مؤكد مباشرة من جوجل).
    // ملاحظة: الـ trigger في Supabase قد يُنشئ صفاً فارغاً (بدون بريد أو دور)، فنعامله كحساب جديد.
    if (!profile || (!profile.role && !profile.email)) {
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
      role = "user"
    } else {
      role = profile.role
    }
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err)
    await supabase.auth.signOut()
    return fail("profile")
  }

  const destination = next || (role === "admin" ? "/users" : `/users/${user.id}`)
  return NextResponse.redirect(new URL(destination, origin))
}
