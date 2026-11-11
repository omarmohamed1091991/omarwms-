"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Languages } from "lucide-react"
import { cn } from "@/lib/utils"
import { readStoredLang, storeLang, type Lang } from "@/lib/i18n/config"

/** زر التبديل بين العربية والإنجليزية. يعرض دائماً اسم اللغة الأخرى بلغتها. */
export function LanguageSwitcher({ className, variant = "light" }: { className?: string; variant?: "light" | "dark" }) {
  const [lang, setLang] = useState<Lang>("ar")
  useEffect(() => setLang(readStoredLang()), [])

  const next: Lang = lang === "en" ? "ar" : "en"
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
        "notranslate inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border transition-colors shrink-0",
        variant === "dark"
          ? "border-white/15 text-slate-200 hover:bg-white/10"
          : "border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
        className,
      )}
    >
      <Languages className="w-4 h-4" />
      <span lang={next}>{next === "en" ? "English" : "العربية"}</span>
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
      <LanguageSwitcher className="bg-white/95 shadow-lg backdrop-blur" />
    </div>
  )
}
