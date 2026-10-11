import Link from "next/link"
import Image from "next/image"
import {
  Users,
  MessageSquare,
  TrendingUp,
  Zap,
  Shield,
  LogIn,
  User,
  BarChart3,
  Inbox,
  Send,
  Settings,
  ImageIcon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { PricingSection } from "@/components/marketing/pricing-section"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()
    profile = data
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/40 to-green-50/40">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-6 max-w-5xl py-16 relative">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6 shadow-sm">
              <Image src="/logo.png" alt="o-wms" width={28} height={28} className="w-7 h-7" />
              o-wms
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
              نظام إدارة رسائل واتساب
              <span className="bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">
                {" "}
                الاحترافي
              </span>
            </h1>

            <p className="text-base text-gray-600 mb-10 leading-relaxed">
              منصة متكاملة لإدارة المستخدمين وإرسال الرسائل الفردية والجماعية مع لوحة تحكم منفصلة لكل مستخدم
            </p>

            {/* Action Cards Grid */}
            {user && profile ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {/* Admin Only Cards */}
                {profile.role === "admin" && (
                  <>
                    {/* إدارة المستخدمين */}
                    <Link href="/users" className="group">
                      <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-emerald-200 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-emerald-100 rounded-full opacity-0 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150" />
                        <div className="relative">
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <Users className="w-7 h-7 text-white" />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 mb-1">إدارة المستخدمين</h3>
                          <p className="text-xs text-gray-500">إضافة وتعديل المستخدمين</p>
                        </div>
                      </div>
                    </Link>

                    {/* الإحصائيات الشاملة */}
                    <Link href="/analytics" className="group">
                      <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-purple-200 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-purple-100 rounded-full opacity-0 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150" />
                        <div className="relative">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <BarChart3 className="w-7 h-7 text-white" />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 mb-1">الإحصائيات الشاملة</h3>
                          <p className="text-xs text-gray-500">تقارير وتحليلات متقدمة</p>
                        </div>
                      </div>
                    </Link>
                  </>
                )}

                {/* لوحة التحكم - للجميع */}
                <Link href={profile.role === "admin" ? "/users" : `/users/${user.id}`} className="group">
                  <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-blue-200 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-blue-100 rounded-full opacity-0 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150" />
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <User className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">لوحة التحكم</h3>
                      <p className="text-xs text-gray-500">إدارة حسابك الشخصي</p>
                    </div>
                  </div>
                </Link>

                {/* رسائل جماعية */}
                <Link href={`/users/${user.id}/bulk`} className="group">
                  <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-green-200 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-green-100 rounded-full opacity-0 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150" />
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <Send className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">رسائل جماعية</h3>
                      <p className="text-xs text-gray-500">إرسال لآلاف المستلمين</p>
                    </div>
                  </div>
                </Link>

                {/* صندوق الوارد */}
                <Link href={`/users/${user.id}/inbox`} className="group">
                  <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-amber-200 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-amber-100 rounded-full opacity-0 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150" />
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <Inbox className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">صندوق الوارد</h3>
                      <p className="text-xs text-gray-500">الرسائل الواردة</p>
                    </div>
                  </div>
                </Link>

                {/* مكتبة الصور */}
                <Link href={`/users/${user.id}/media`} className="group">
                  <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-teal-200 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-teal-100 rounded-full opacity-0 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150" />
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <ImageIcon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">مكتبة الصور</h3>
                      <p className="text-xs text-gray-500">إدارة الوسائط</p>
                    </div>
                  </div>
                </Link>

                {/* الإعدادات */}
                <Link href={`/users/${user.id}/settings`} className="group">
                  <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-gray-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 to-slate-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gray-100 rounded-full opacity-0 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150" />
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-600 to-slate-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <Settings className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">الإعدادات</h3>
                      <p className="text-xs text-gray-500">تخصيص الحساب</p>
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              /* Not logged in - Show login button */
              <div className="flex flex-col items-center gap-4">
                <Link href="/auth/login" className="group">
                  <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-emerald-200 overflow-hidden min-w-[200px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-100 rounded-full opacity-0 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150" />
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <LogIn className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">تسجيل الدخول</h3>
                      <p className="text-sm text-gray-500">للوصول إلى لوحة التحكم</p>
                    </div>
                  </div>
                </Link>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <Link
                    href="/auth/signup"
                    className="h-10 px-5 leading-10 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                  >
                    إنشاء حساب جديد
                  </Link>
                  <Link
                    href="/#pricing"
                    className="h-10 px-5 leading-10 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    عرض الباقات والأسعار
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 max-w-6xl py-16">
        <h3 className="text-xl font-bold text-gray-900 text-center mb-10">المزايا الرئيسية</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: TrendingUp,
              title: "تقارير وإحصائيات",
              desc: "تتبع دقيق لحالة الرسائل مع تحليلات شاملة",
              color: "purple",
            },
            {
              icon: MessageSquare,
              title: "رسائل فردية وجماعية",
              desc: "إرسال رسائل مخصصة أو حملات جماعية لآلاف المستلمين",
              color: "blue",
            },
            {
              icon: Users,
              title: "إدارة متعددة المستخدمين",
              desc: "لوحات تحكم منفصلة لكل مستخدم مع إدارة شاملة",
              color: "pink",
            },
            {
              icon: Inbox,
              title: "صندوق وارد ذكي",
              desc: "استقبال وإدارة الرسائل الواردة بشكل منفصل",
              color: "indigo",
            },
            {
              icon: Shield,
              title: "أمان وخصوصية",
              desc: "حماية كاملة مع عزل تام بين حسابات المستخدمين",
              color: "orange",
            },
            { icon: Zap, title: "سرعة وكفاءة", desc: "نظام محسّن لإرسال آلاف الرسائل بكفاءة عالية", color: "green" },
          ].map((feature, index) => (
            <div
              key={index}
              className="group bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-4 mb-3">
                <div
                  className={`p-3 bg-${feature.color}-50 rounded-xl group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className={`w-5 h-5 text-${feature.color}-600`} />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">{feature.title}</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed pr-16">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <PricingSection />

      <SiteFooter />
    </div>
  )
}
