import type { LucideIcon } from "lucide-react"
import { Inbox, MessageSquare, Shield, TrendingUp, Users, Zap } from "lucide-react"

type Feature = {
  icon: LucideIcon
  title: string
  desc: string
  /** Static Tailwind classes (no dynamic class names, so they survive purging). */
  tone: { icon: string; glow: string; border: string }
}

const features: Feature[] = [
  {
    icon: MessageSquare,
    title: "رسائل فردية وجماعية",
    desc: "إرسال رسائل مخصصة أو حملات جماعية لآلاف المستلمين بضغطة زر.",
    tone: { icon: "bg-blue-50 text-blue-600 ring-blue-100", glow: "bg-blue-100", border: "group-hover:border-blue-100" },
  },
  {
    icon: TrendingUp,
    title: "تقارير وإحصائيات",
    desc: "تتبع دقيق لحالة كل رسالة مع تحليلات شاملة للأداء.",
    tone: {
      icon: "bg-purple-50 text-purple-600 ring-purple-100",
      glow: "bg-purple-100",
      border: "group-hover:border-purple-100",
    },
  },
  {
    icon: Users,
    title: "إدارة متعددة المستخدمين",
    desc: "لوحات تحكم منفصلة لكل مستخدم مع إدارة مركزية شاملة.",
    tone: { icon: "bg-pink-50 text-pink-600 ring-pink-100", glow: "bg-pink-100", border: "group-hover:border-pink-100" },
  },
  {
    icon: Inbox,
    title: "صندوق وارد ذكي",
    desc: "استقبال الرسائل الواردة والرد عليها من شاشة واحدة منظمة.",
    tone: {
      icon: "bg-indigo-50 text-indigo-600 ring-indigo-100",
      glow: "bg-indigo-100",
      border: "group-hover:border-indigo-100",
    },
  },
  {
    icon: Shield,
    title: "أمان وخصوصية",
    desc: "حماية كاملة مع عزل تام بين بيانات وحسابات المستخدمين.",
    tone: {
      icon: "bg-orange-50 text-orange-600 ring-orange-100",
      glow: "bg-orange-100",
      border: "group-hover:border-orange-100",
    },
  },
  {
    icon: Zap,
    title: "سرعة وكفاءة",
    desc: "نظام محسّن لإرسال آلاف الرسائل بكفاءة واستقرار عاليين.",
    tone: {
      icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      glow: "bg-emerald-100",
      border: "group-hover:border-emerald-100",
    },
  },
]

export function FeaturesSection() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24 py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">لماذا o-wms؟</span>
          <h2 id="features-title" className="mt-3 text-2xl font-bold text-gray-900 md:text-3xl">
            المزايا الرئيسية
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 md:text-base">
            كل ما تحتاجه لإدارة تواصلك مع العملاء عبر واتساب في منصة واحدة سهلة وآمنة.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {features.map(({ icon: Icon, title, desc, tone }) => (
            <li key={title}>
              <article
                className={`group relative h-full overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-6px_rgba(16,24,40,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(16,24,40,0.22)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-7 ${tone.border}`}
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-70 ${tone.glow}`}
                />
                <div className="relative">
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110 ${tone.icon}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{desc}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
