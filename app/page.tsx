import Link from "next/link"
import Image from "next/image"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ImageIcon,
  Inbox,
  LogIn,
  Send,
  Settings,
  User,
  Users,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { PricingSection } from "@/components/marketing/pricing-section"
import { FeaturesSection } from "@/components/marketing/features-section"
import { IntegrationsSection } from "@/components/marketing/integrations-section"
import { MetaLogo, WhatsAppLogo } from "@/components/marketing/brand-logos"

type QuickAction = {
  href: string
  title: string
  desc: string
  icon: LucideIcon
  /** Static Tailwind classes so they are always generated. */
  gradient: string
  hoverBorder: string
}

function getQuickActions(userId: string, isAdmin: boolean): QuickAction[] {
  const admin: QuickAction[] = isAdmin
    ? [
        {
          href: "/users",
          title: "إدارة المستخدمين",
          desc: "إضافة وتعديل المستخدمين",
          icon: Users,
          gradient: "from-emerald-500 to-green-500",
          hoverBorder: "hover:border-emerald-200",
        },
        {
          href: "/analytics",
          title: "الإحصائيات الشاملة",
          desc: "تقارير وتحليلات متقدمة",
          icon: BarChart3,
          gradient: "from-purple-500 to-indigo-500",
          hoverBorder: "hover:border-purple-200",
        },
      ]
    : []

  return [
    ...admin,
    {
      href: isAdmin ? "/users" : `/users/${userId}`,
      title: "لوحة التحكم",
      desc: "إدارة حسابك الشخصي",
      icon: User,
      gradient: "from-blue-500 to-cyan-500",
      hoverBorder: "hover:border-blue-200",
    },
    {
      href: `/users/${userId}/bulk`,
      title: "رسائل جماعية",
      desc: "إرسال لآلاف المستلمين",
      icon: Send,
      gradient: "from-green-500 to-emerald-500",
      hoverBorder: "hover:border-green-200",
    },
    {
      href: `/users/${userId}/inbox`,
      title: "صندوق الوارد",
      desc: "الرسائل الواردة",
      icon: Inbox,
      gradient: "from-amber-500 to-orange-500",
      hoverBorder: "hover:border-amber-200",
    },
    {
      href: `/users/${userId}/media`,
      title: "مكتبة الصور",
      desc: "إدارة الوسائط",
      icon: ImageIcon,
      gradient: "from-teal-500 to-cyan-500",
      hoverBorder: "hover:border-teal-200",
    },
    {
      href: `/users/${userId}/settings`,
      title: "الإعدادات",
      desc: "تخصيص الحساب",
      icon: Settings,
      gradient: "from-gray-600 to-slate-600",
      hoverBorder: "hover:border-gray-300",
    },
  ]
}

const heroPoints = ["ربط رسمي مع Meta", "حملات جماعية ورسائل فردية", "لوحة تحكم لكل مستخدم"]

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile: { role?: string | null } | null = null
  if (user) {
    const { data } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()
    profile = data
  }

  const quickActions = user && profile ? getQuickActions(user.id, profile.role === "admin") : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-gray-50">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-emerald-200/40 blur-3xl motion-safe:animate-pulse" />
            <div className="absolute -bottom-48 -left-24 h-[24rem] w-[24rem] rounded-full bg-green-200/30 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(5,150,105,0.08)_1px,transparent_0)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          </div>

          <div className="container relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 md:pb-24 md:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 py-1.5 pl-4 pr-1.5 text-sm font-medium text-emerald-700 shadow-sm backdrop-blur">
                <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" />
                o-wms · منصة واتساب للأعمال
              </div>

              <h1 className="mt-6 text-3xl font-extrabold leading-tight text-gray-900 text-balance sm:text-4xl md:text-5xl md:leading-[1.2]">
                نظام إدارة رسائل واتساب{" "}
                <span className="bg-gradient-to-l from-emerald-600 to-green-700 bg-clip-text text-transparent">
                  الاحترافي
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-600 md:text-lg">
                منصة متكاملة لإدارة المستخدمين وإرسال الرسائل الفردية والجماعية مع لوحة تحكم منفصلة لكل مستخدم
              </p>

              <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-600">
                {heroPoints.map((point) => (
                  <li key={point} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {quickActions ? (
              <div className="mx-auto mt-12 max-w-4xl">
                <h2 className="sr-only">الوصول السريع</h2>
                <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {quickActions.map(({ href, title, desc, icon: Icon, gradient, hoverBorder }) => (
                    <li key={title}>
                      <Link
                        href={href}
                        className={`group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_-16px_rgba(16,24,40,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6 ${hoverBorder}`}
                      >
                        <div
                          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14 ${gradient}`}
                        >
                          <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                        <p className="mt-1 text-xs text-gray-500">{desc}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/auth/signup"
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-600 to-green-600 px-7 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(5,150,105,0.7)] transition-all hover:from-emerald-700 hover:to-green-700 hover:shadow-[0_14px_28px_-10px_rgba(5,150,105,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto"
                >
                  إنشاء حساب جديد
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-7 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto"
                >
                  <LogIn className="h-4 w-4" aria-hidden />
                  تسجيل الدخول
                </Link>
                <Link
                  href="/#pricing"
                  className="inline-flex h-12 items-center justify-center px-4 text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
                >
                  عرض الباقات والأسعار
                </Link>
              </div>
            )}

            {/* Trust strip */}
            <div className="mt-14 flex flex-col items-center gap-3">
              <p className="text-xs font-medium text-gray-500">يعمل بالربط المباشر مع</p>
              <div className="flex items-center gap-6 rounded-2xl border border-gray-100 bg-white/80 px-6 py-3 shadow-sm backdrop-blur">
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-800" dir="ltr">
                  <WhatsAppLogo className="h-6 w-6" aria-hidden />
                  WhatsApp
                </span>
                <span aria-hidden className="h-6 w-px bg-gray-200" />
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-800" dir="ltr">
                  <MetaLogo className="h-5 w-9" aria-hidden />
                  Meta
                </span>
              </div>
            </div>
          </div>
        </section>

        <FeaturesSection />

        <IntegrationsSection />

        <PricingSection />
      </main>

      <SiteFooter />
    </div>
  )
}
