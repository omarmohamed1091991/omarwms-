export type Lang = "ar" | "en"

export const LANG_COOKIE = "lang"
export const LANG_STORAGE_KEY = "o-wms-lang"
export const DEFAULT_LANG: Lang = "ar"

/** يقرأ اللغة المحفوظة في المتصفح (localStorage ثم الكوكي). */
export function readStoredLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY)
    if (v === "en" || v === "ar") return v
  } catch {}
  const m = document.cookie.match(/(?:^|;\s*)lang=(ar|en)/)
  return (m?.[1] as Lang) || DEFAULT_LANG
}

export function storeLang(lang: Lang) {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {}
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`
}

/**
 * سكربت يُنفَّذ قبل عرض الصفحة لضبط اتجاه الصفحة ولغتها مبكراً، ويخفي المحتوى
 * لحظياً حتى تكتمل الترجمة لتجنب ظهور النص العربي ثم تبدّله.
 */
export const LANG_BOOTSTRAP_SCRIPT = `(function(){try{var l=null;try{l=localStorage.getItem(${JSON.stringify(
  LANG_STORAGE_KEY,
)})}catch(e){}if(l!=="en"&&l!=="ar"){var m=document.cookie.match(/(?:^|;\\s*)lang=(ar|en)/);l=m?m[1]:"ar"}if(l==="en"){var d=document.documentElement;d.lang="en";d.dir="ltr";d.classList.add("i18n-pending");setTimeout(function(){d.classList.remove("i18n-pending")},2500)}}catch(e){}})();`
