import type { ComponentType, ReactNode, SVGProps } from "react"
import Image from "next/image"
import { ArrowLeftRight, BadgeCheck, Cloud, Lock, Webhook } from "lucide-react"
import {
  MetaBusinessSuiteLogo,
  MetaLogo,
  WhatsAppBusinessLogo,
  WhatsAppLogo,
} from "@/components/marketing/brand-logos"

type Integration = {
  name: string
  label: string
  desc: string
  Logo: ComponentType<SVGProps<SVGSVGElement>>
  logoClass: string
  ring: string
}

const integrations: Integration[] = [
  {
    name: "WhatsApp",
    label: "واتساب",
    desc: "إرسال واستقبال الرسائل مباشرةً على أرقام عملائك",
    Logo: WhatsAppLogo,
    logoClass: "h-10 w-10",
    ring: "group-hover:ring-emerald-200",
  },
  {
    name: "WhatsApp Business API",
    label: "واجهة واتساب للأعمال",
    desc: "رسائل القوالب المعتمدة والحملات الجماعية عبر الواجهة الرسمية",
    Logo: WhatsAppBusinessLogo,
    logoClass: "h-11 w-11",
    ring: "group-hover:ring-emerald-200",
  },
  {
    name: "Meta",
    label: "منصة Meta السحابية",
    desc: "بنية Meta Cloud API لتسليم سريع وموثوق على مستوى عالمي",
    Logo: MetaLogo,
    logoClass: "h-8 w-14",
    ring: "group-hover:ring-blue-200",
  },
  {
    name: "Meta Business Suite",
    label: "مدير أعمال Meta",
    desc: "ربط حسابك التجاري وإدارة الأرقام والقوالب من مكان واحد",
    Logo: MetaBusinessSuiteLogo,
    logoClass: "h-11 w-11",
    ring: "group-hover:ring-blue-200",
  },
]

const highlights = [
  { icon: BadgeCheck, text: "ربط رسمي عبر واجهات Meta" },
  { icon: Webhook, text: "استقبال فوري عبر Webhooks" },
  { icon: Lock, text: "تشفير واتصال آمن" },
]

export function IntegrationsSection() {
  return (
    <section id="integrations" aria-labelledby="integrations-title" className="scroll-mt-24 py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white px-5 py-12 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_48px_-24px_rgba(16,24,40,0.12)] sm:px-10 md:py-16">
          {/* Decorative background */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 right-1/4 h-64 w-64 rounded-full bg-emerald-100/60 blur-3xl" />
            <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />
          </div>

          <div className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Cloud className="h-3.5 w-3.5" />
                الربط والتكامل
              </span>
              <h2
                id="integrations-title"
                className="mt-5 text-2xl font-bold leading-snug text-gray-900 text-balance md:text-3xl md:leading-snug"
              >
                منصة معتمدة للربط المباشر مع واجهة برمجيات{" "}
                <span className="text-emerald-600" dir="ltr">
                  WhatsApp Business API
                </span>{" "}
                وبنية{" "}
                <span className="text-blue-600" dir="ltr">
                  Meta
                </span>{" "}
                السحابية
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 md:text-base">
                تتصل o-wms مباشرةً بخدمات واتساب وميتا الرسمية دون وسطاء، لتضمن لك سرعة التسليم واستقرار الحساب
                والتوافق الكامل مع سياسات Meta.
              </p>
            </div>

            {/* Connection flow */}
            <div
              className="mx-auto mt-10 flex max-w-xl items-center justify-center gap-3 sm:gap-5"
              aria-label="مسار الربط: o-wms مع Meta مع WhatsApp"
            >
              <FlowNode>
                <Image src="/logo.png" alt="o-wms" width={40} height={40} className="h-9 w-9 sm:h-10 sm:w-10" />
              </FlowNode>
              <FlowLink />
              <FlowNode>
                <MetaLogo className="h-7 w-12 sm:h-8 sm:w-14" />
              </FlowNode>
              <FlowLink />
              <FlowNode>
                <WhatsAppLogo className="h-9 w-9 sm:h-10 sm:w-10" />
              </FlowNode>
            </div>

            {/* Logo cards */}
            <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {integrations.map(({ name, label, desc, Logo, logoClass, ring }) => (
                <li key={name}>
                  <div className="group flex h-full flex-col items-center rounded-2xl border border-gray-100 bg-white/90 p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_12px_32px_-12px_rgba(16,24,40,0.18)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-gray-100 transition-all duration-300 group-hover:scale-105 group-hover:bg-white ${ring}`}
                    >
                      <Logo className={logoClass} aria-hidden />
                    </div>
                    <p className="mt-4 text-sm font-bold text-gray-900" dir="ltr">
                      {name}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-gray-500">{label}</p>
                    <p className="mt-3 text-xs leading-relaxed text-gray-600">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {highlights.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-xs font-medium text-gray-600 sm:text-sm">
                  <Icon className="h-4 w-4 text-emerald-600" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>

            <p className="mt-8 text-center text-[11px] leading-relaxed text-gray-400">
              WhatsApp وMeta علامتان تجاريتان مملوكتان لشركة Meta Platforms, Inc. ويُستخدم ذكرهما هنا لتوضيح التكامل
              التقني فقط.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FlowNode({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-[0_8px_24px_-12px_rgba(16,24,40,0.2)] sm:h-20 sm:w-20">
      {children}
    </div>
  )
}

function FlowLink() {
  return (
    <div aria-hidden className="relative flex flex-1 items-center">
      <div className="h-px w-full bg-gradient-to-l from-emerald-300 via-gray-200 to-blue-300" />
      <span className="absolute left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-sm">
        <ArrowLeftRight className="h-3.5 w-3.5" />
      </span>
    </div>
  )
}
