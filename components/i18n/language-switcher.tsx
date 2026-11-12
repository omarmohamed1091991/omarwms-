"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { readStoredLang, storeLang, type Lang } from "@/lib/i18n/config"

/**
 * زر التبديل بين العربية والإنجليزية بتصميم كبسولة عصرية:
 * يعرض اللغتين معاً مع إبراز اللغة الحالية، والضغط في أي مكان يبدّل اللغة.
 */
export function LanguageSwitcher({ className, variant = "light" }: { className?: string; variant?: "light" | "dark" }) {
  const [lang, setLang] = useState<Lang>("ar")
  useEffect(() => setLang(readStoredLang()), [])

  const next: Lang = lang === "en" ? "ar" : "en"
  const dark = variant === "dark"
  const segments: { code: Lang; label: string }[] = [
    { code: "ar", label: "عربي" },
    { code: "en", label: "EN" },
  ]

  return (
    <button
      type="button"
      translate="no"
      data-lang-switcher=""
      onClick={() => {
        storeLang(next)
        window.location.reload()
      }}
      aria-label={next === "en" ? "Switch to English" : "التبديل إلى العربية"}
      title={next === "en" ? "Switch to English" : "التبديل إلى العربية"}
      className={cn(
        "notranslate group relative isolate inline-flex items-center gap-1 h-9 p-1 ps-2 rounded-full border overflow-hidden shrink-0 cursor-pointer select-none",
        "text-xs font-semibold transition-all duration-300 ease-out",
        "motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        dark
          ? "border-white/15 bg-white/[0.06] text-slate-300 hover:border-emerald-400/60 hover:bg-white/10 hover:shadow-[0_6px_20px_-6px_rgba(16,185,129,0.55)] focus-visible:ring-emerald-400 focus-visible:ring-offset-slate-900"
          : "border-emerald-200 bg-gradient-to-b from-white to-emerald-50 text-gray-600 shadow-sm shadow-emerald-900/5 hover:border-emerald-400 hover:shadow-[0_8px_22px_-8px_rgba(5,150,105,0.5)] focus-visible:ring-emerald-500 focus-visible:ring-offset-white",
        className,
      )}
    >
      {/* لمعة تمر عبر الزر عند مرور الماوس */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 -start-1/2 w-1/2 -z-10 skew-x-[-20deg] opacity-0 transition-all duration-700 ease-out",
          "group-hover:opacity-100 motion-safe:group-hover:start-[120%]",
          dark ? "bg-gradient-to-r from-transparent via-white/10 to-transparent" : "bg-gradient-to-r from-transparent via-white/80 to-transparent",
        )}
      />
      <Globe
        aria-hidden
        className={cn(
          "w-4 h-4 shrink-0 transition-transform duration-500 ease-out motion-safe:group-hover:rotate-[200deg]",
          dark ? "text-emerald-400" : "text-emerald-600",
        )}
      />
      <span className={cn("flex items-center h-full rounded-full p-0.5 gap-0.5", dark ? "bg-black/20" : "bg-emerald-100/60")}>
        {segments.map((s) => {
          const active = s.code === lang
          return (
            <span
              key={s.code}
              lang={s.code}
              className={cn(
                "inline-flex items-center justify-center h-full min-w-9 px-2 rounded-full leading-none transition-all duration-300",
                active
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/40"
                  : dark
                    ? "text-slate-400 group-hover:text-white group-hover:bg-white/10"
                    : "text-gray-500 group-hover:text-emerald-700 group-hover:bg-white",
              )}
            >
              {s.label}
            </span>
          )
        })}
      </span>
    </button>
  )
}

/**
 * زر عائم يظهر فقط في الصفحات التي لا تحتوي على زر تبديل اللغة في رأسها
 * (مثل تسجيل الدخول وإتمام الدفع)، حتى يتوفر التبديل في كل صفحات الموقع.
 */
export function FloatingLanguageSwitcher() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  useEffect(() => {
    setShow(false)
    const id = window.setTimeout(() => setShow(!document.querySelector("[data-lang-switcher]")), 300)
    return () => window.clearTimeout(id)
  }, [pathname])
  if (!show) return null
  return (
    <div className="fixed bottom-4 start-4 z-[60] print:hidden">
      <LanguageSwitcher className="h-10 bg-white/95 shadow-lg shadow-emerald-900/10 backdrop-blur" />
    </div>
  )
}
