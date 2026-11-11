"use client"

/**
 * مترجم واجهة الموقع إلى الإنجليزية.
 *
 * نصوص الواجهة مكتوبة بالعربية داخل المكونات. بدلاً من تعديل كل مكون، يمر هذا المترجم
 * على عناصر الصفحة (والعناصر التي تُضاف لاحقاً) ويستبدل كل نص عربي بمقابله الإنجليزي
 * من القاموس `en.json` (المفتاح هو النص العربي كما هو في الكود).
 * لا نستبدل العُقد نفسها بل قيمتها فقط، لذلك يبقى React قادراً على تحديثها بشكل طبيعي.
 */

export type Dictionary = Record<string, string>

const AR_RE = /[؀-ۿ]/
const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "svg"])

const MONTHS: [RegExp, string][] = [
  [/يناير/g, "January"],
  [/فبراير/g, "February"],
  [/مارس/g, "March"],
  [/[أإا]بريل/g, "April"],
  [/مايو/g, "May"],
  [/يونيو/g, "June"],
  [/يوليو/g, "July"],
  [/أغسطس/g, "August"],
  [/سبتمبر/g, "September"],
  [/أكتوبر/g, "October"],
  [/نوفمبر/g, "November"],
  [/ديسمبر/g, "December"],
  [/الأحد/g, "Sunday"],
  [/ال[إا]ثنين/g, "Monday"],
  [/الثلاثاء/g, "Tuesday"],
  [/الأربعاء/g, "Wednesday"],
  [/الخميس/g, "Thursday"],
  [/الجمعة/g, "Friday"],
  [/السبت/g, "Saturday"],
  [/ج\.م\.?/g, "EGP"],
  [/ر\.س\.?/g, "SAR"],
  [/(\d)\s*ص(?![؀-ۿ])/g, "$1 AM"],
  [/(\d)\s*م(?![؀-ۿ])/g, "$1 PM"],
]

/** تحويل الأرقام والتواريخ والرموز العربية إلى مقابلها الإنجليزي. */
function normalizeArabicFormatting(s: string) {
  let out = s
    .replace(/[‏‎؜]/g, "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",")
  for (const [re, en] of MONTHS) out = out.replace(re, en)
  return out.replace(/،/g, ",").replace(/؛/g, ";").replace(/؟/g, "?")
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim()
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

type Pattern = { re: RegExp; order: number[]; template: string }

export class Translator {
  private dict: Map<string, string>
  private patterns: Pattern[] = []
  private cache = new Map<string, string | null>()
  private written = new WeakMap<Node, string>()
  private writtenAttr = new WeakMap<Element, Map<string, string>>()
  private observer: MutationObserver | null = null

  constructor(dictionary: Dictionary) {
    this.dict = new Map()
    const patterns: { p: Pattern; literal: number }[] = []
    for (const [rawKey, value] of Object.entries(dictionary)) {
      const key = collapse(rawKey)
      if (!value) continue
      this.dict.set(key, value)
      if (/\{\d+\}/.test(key)) {
        const order: number[] = []
        const source = key
          .split(/(\{\d+\})/)
          .map((part) => {
            const m = part.match(/^\{(\d+)\}$/)
            if (m) {
              order.push(Number(m[1]))
              return "([\\s\\S]+?)"
            }
            return escapeRe(part)
          })
          .join("")
        const literal = key.replace(/\{\d+\}/g, "").length
        if (literal < 2) continue
        patterns.push({ p: { re: new RegExp(`^${source}$`), order, template: value }, literal })
      }
    }
    this.patterns = patterns.sort((a, b) => b.literal - a.literal).map((x) => x.p)
  }

  /** يترجم نصاً كاملاً؛ يعيد null إن لم يجد ترجمة. */
  translate(input: string, depth = 0): string | null {
    const text = collapse(input)
    if (!text || !AR_RE.test(text)) return text
    const cached = this.cache.get(text)
    if (cached !== undefined) return cached
    const result = this.lookup(text, depth)
    this.cache.set(text, result)
    return result
  }

  private lookup(text: string, depth: number): string | null {
    const exact = this.dict.get(text)
    if (exact !== undefined) return exact

    // تواريخ وأرقام بصيغة عربية
    const normalized = normalizeArabicFormatting(text)
    if (!AR_RE.test(normalized)) return normalized
    const exactNormalized = this.dict.get(normalized)
    if (exactNormalized !== undefined) return exactNormalized

    if (depth > 2) return null

    // نصوص فيها قيم متغيرة: "حتى {0} ميجابايت"
    for (const p of this.patterns) {
      const m = text.match(p.re) || normalized.match(p.re)
      if (!m) continue
      let out = p.template
      let ok = true
      p.order.forEach((idx, i) => {
        const val = m[i + 1]
        // قيمة عربية غير معروفة (مثل نص كتبه المستخدم) تعني أن هذا القالب لا ينطبق
        const tr = AR_RE.test(val) ? this.translate(val, depth + 1) : normalizeArabicFormatting(val)
        if (tr === null) ok = false
        else out = out.replace(`{${idx}}`, tr)
      })
      if (ok) return out
    }

    // علامات ترقيم في البداية أو النهاية: "الاسم:" أو "(اختياري)"
    const punct = text.match(/^([\s(«"'•\-–—*:.]*)([\s\S]*?)([\s)»"'.:؟?!،,*\-–—]*)$/)
    if (punct && (punct[1] || punct[3]) && punct[2]) {
      const core = this.translate(punct[2], depth + 1)
      if (core !== null) return normalizeArabicFormatting(punct[1]) + core + normalizeArabicFormatting(punct[3])
    }

    // نص مركب من أجزاء: "الباقة — شهري" أو "الحالة: نشط"
    const parts = text.split(/(\s[—–\-·|/•]\s|:\s|،\s|\s\(|\)\s?)/)
    if (parts.length > 1) {
      let ok = true
      const out = parts.map((part) => {
        if (!AR_RE.test(part)) return normalizeArabicFormatting(part)
        const tr = this.translate(part, depth + 1)
        if (tr === null) ok = false
        return tr ?? part
      })
      if (ok) return out.join("")
    }
    return null
  }

  private skip(el: Element | null): boolean {
    for (let e = el; e; e = e.parentElement) {
      if (SKIP_TAGS.has(e.tagName)) return true
      if (e.getAttribute("translate") === "no" || e.classList.contains("notranslate")) return true
      if ((e as HTMLElement).isContentEditable) return true
    }
    return false
  }

  private translateTextNode(node: Text) {
    const value = node.nodeValue
    if (!value || !AR_RE.test(value)) return
    if (this.written.get(node) === value) return
    if (this.skip(node.parentElement)) return
    let tr = this.translate(value)
    // نصوص متعددة الأسطر (مثل رسائل الأخطاء المفصلة): نترجم كل سطر على حدة
    if (tr === null && value.includes("\n")) {
      const lines = value.split("\n")
      if (lines.every((l) => !AR_RE.test(l) || this.translate(l) !== null)) {
        const joined = lines.map((l) => (AR_RE.test(l) ? this.translate(l) : l)).join("\n")
        this.written.set(node, joined)
        node.nodeValue = joined
        return
      }
    }
    if (tr === null || tr === collapse(value)) return
    const lead = value.match(/^\s*/)?.[0] ?? ""
    const trail = value.match(/\s*$/)?.[0] ?? ""
    const next = (lead ? " " : "") + tr + (trail ? " " : "")
    this.written.set(node, next)
    node.nodeValue = next
  }

  private translateAttributes(el: Element) {
    if (el.getAttribute("dir") === "rtl" && el !== document.documentElement) el.setAttribute("dir", "ltr")
    const done = this.writtenAttr.get(el)
    const names: string[] = [...ATTRS]
    if (el.tagName === "INPUT" && /^(button|submit|reset)$/i.test((el as HTMLInputElement).type)) names.push("value")
    for (const name of names) {
      const v = el.getAttribute(name)
      if (!v || !AR_RE.test(v) || done?.get(name) === v) continue
      const tr = this.translate(v)
      if (tr === null) continue
      const map = done ?? new Map<string, string>()
      map.set(name, tr)
      this.writtenAttr.set(el, map)
      el.setAttribute(name, tr)
    }
  }

  translateTree(root: Node) {
    if (root.nodeType === Node.TEXT_NODE) {
      this.translateTextNode(root as Text)
      return
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return
    if (root.nodeType === Node.ELEMENT_NODE) {
      const el = root as Element
      if (this.skip(el)) return
      this.translateAttributes(el)
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => {
        if (n.nodeType === Node.ELEMENT_NODE) {
          const el = n as Element
          if (SKIP_TAGS.has(el.tagName) || el.getAttribute("translate") === "no" || el.classList.contains("notranslate"))
            return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      },
    })
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeType === Node.TEXT_NODE) this.translateTextNode(n as Text)
      else this.translateAttributes(n as Element)
    }
  }

  start() {
    this.translateTree(document.documentElement)
    if (document.title && AR_RE.test(document.title)) {
      const t = this.translate(document.title)
      if (t) document.title = t
    }
    this.observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "characterData") this.translateTextNode(m.target as Text)
        else if (m.type === "attributes") this.translateAttributes(m.target as Element)
        else m.addedNodes.forEach((n) => this.translateTree(n))
      }
    })
    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS, "value", "dir"],
    })
  }

  stop() {
    this.observer?.disconnect()
    this.observer = null
  }
}

/** ترجمة رسائل alert/confirm/prompt وتنسيق التواريخ والأرقام بالإنجليزية. */
export function patchBrowserApis(t: Translator) {
  const w = window as Window & { __i18nPatched?: boolean }
  if (w.__i18nPatched) return
  w.__i18nPatched = true

  const tr = (msg: unknown) => {
    if (typeof msg !== "string" || !AR_RE.test(msg)) return msg
    return msg
      .split("\n")
      .map((line) => (AR_RE.test(line) ? t.translate(line) ?? line : line))
      .join("\n")
  }
  const { alert, confirm, prompt } = window
  window.alert = (m?: unknown) => alert.call(window, tr(m))
  window.confirm = (m?: string) => confirm.call(window, tr(m) as string)
  window.prompt = (m?: string, d?: string) => prompt.call(window, tr(m) as string, d)

  const mapLocale = (l: unknown) => {
    if (l === undefined) return "en-US"
    const list = Array.isArray(l) ? l : [l]
    return list.map((x) => (typeof x === "string" && /^ar\b/i.test(x) ? "en-US" : x))
  }
  const wrapProto = (proto: object, name: string) => {
    const p = proto as Record<string, (...a: unknown[]) => string>
    const orig = p[name]
    p[name] = function (this: unknown, locales?: unknown, options?: unknown) {
      return orig.call(this, mapLocale(locales), options)
    }
  }
  wrapProto(Date.prototype, "toLocaleDateString")
  wrapProto(Date.prototype, "toLocaleTimeString")
  wrapProto(Date.prototype, "toLocaleString")
  wrapProto(Number.prototype, "toLocaleString")

  for (const name of ["DateTimeFormat", "NumberFormat", "RelativeTimeFormat", "PluralRules", "ListFormat"] as const) {
    const Orig = (Intl as Record<string, unknown>)[name] as (new (...a: unknown[]) => unknown) & {
      supportedLocalesOf: unknown
    }
    if (!Orig) continue
    const Wrapped = function (this: unknown, locales?: unknown, options?: unknown) {
      return new Orig(mapLocale(locales), options)
    } as unknown as typeof Orig
    Wrapped.prototype = Orig.prototype
    Wrapped.supportedLocalesOf = Orig.supportedLocalesOf
    ;(Intl as Record<string, unknown>)[name] = Wrapped
  }
}
