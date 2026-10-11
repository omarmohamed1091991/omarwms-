import Link from "next/link"
import Image from "next/image"
import { LogIn, LogOut, UserPlus, LayoutDashboard, Menu, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { mainNav, legalNav } from "@/lib/site-config"

async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()
    return { id: user.id, role: profile?.role as string | undefined }
  } catch {
    return null
  }
}

async function signOut() {
  "use server"
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function SiteHeader() {
  const user = await getCurrentUser()
  const dashboardHref = user ? (user.role === "admin" ? "/users" : `/users/${user.id}`) : "/auth/login"

  const authActions = user ? (
    <>
      <Link
        href={dashboardHref}
        className="flex items-center gap-1.5 text-xs h-9 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg transition-all"
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        لوحة التحكم
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="flex items-center gap-1.5 text-xs h-9 px-4 bg-transparent border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          تسجيل الخروج
        </button>
      </form>
    </>
  ) : (
    <>
      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 text-xs h-9 px-4 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
      >
        <LogIn className="w-3.5 h-3.5" />
        تسجيل الدخول
      </Link>
      <Link
        href="/auth/signup"
        className="flex items-center gap-1.5 text-xs h-9 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg transition-all"
      >
        <UserPlus className="w-3.5 h-3.5" />
        إنشاء حساب
      </Link>
    </>
  )

  return (
    <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 max-w-7xl py-3">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image src="/logo.png" alt="o-wms" width={48} height={48} className="w-12 h-12" />
            <div>
              <p className="text-base font-semibold text-gray-900">o-wms</p>
              <p className="text-xs text-gray-500">نظام واتساب احترافي</p>
            </div>
          </Link>

          <nav aria-label="القائمة الرئيسية" className="hidden lg:flex items-center gap-1 text-sm">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <details className="relative group">
              <summary className="list-none cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors [&::-webkit-details-marker]:hidden">
                السياسات
                <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-gray-100 rounded-xl shadow-lg p-2">
                {legalNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 rounded-lg text-gray-700 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          </nav>

          <div className="hidden lg:flex items-center gap-2">{authActions}</div>

          <details className="lg:hidden relative group">
            <summary
              aria-label="فتح القائمة"
              className="list-none cursor-pointer p-2 rounded-lg border border-gray-200 text-gray-700 [&::-webkit-details-marker]:hidden"
            >
              <Menu className="w-5 h-5" />
            </summary>
            <div className="absolute top-full mt-2 left-0 w-72 bg-white border border-gray-100 rounded-xl shadow-lg p-3 space-y-1">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-emerald-50"
                >
                  {item.label}
                </Link>
              ))}
              <p className="px-3 pt-2 text-xs font-semibold text-gray-400">السياسات</p>
              {legalNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-emerald-50"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-wrap gap-2 pt-3 border-t mt-2">{authActions}</div>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
