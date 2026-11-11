"use client"

import { useEffect } from "react"
import { readStoredLang } from "@/lib/i18n/config"

/**
 * عند اختيار الإنجليزية: يحمّل القاموس ويترجم الصفحة كاملة ويتابع أي محتوى يظهر لاحقاً.
 * القاموس لا يُحمَّل إطلاقاً لمستخدمي العربية.
 */
export function LanguageProvider() {
  useEffect(() => {
    const root = document.documentElement
    if (readStoredLang() !== "en") {
      root.classList.remove("i18n-pending")
      return
    }
    root.lang = "en"
    root.dir = "ltr"

    let translator: import("@/lib/i18n/translator").Translator | null = null
    let cancelled = false
    Promise.all([import("@/lib/i18n/translator"), import("@/lib/i18n/en.json")])
      .then(([{ Translator, patchBrowserApis }, dict]) => {
        if (cancelled) return
        const mod = dict as unknown as { default?: Record<string, string> } & Record<string, string>
        translator = new Translator(mod.default ?? mod)
        patchBrowserApis(translator)
        translator.start()
      })
      .catch((err) => console.error("[i18n] failed to load translations", err))
      .finally(() => root.classList.remove("i18n-pending"))

    return () => {
      cancelled = true
      translator?.stop()
    }
  }, [])

  return null
}
