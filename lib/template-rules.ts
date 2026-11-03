// قواعد إنشاء قوالب واتساب وفق سياسات Meta (WhatsApp Business Platform).
// تُستخدم في المتصفح للتحقق الفوري والمعاينة، وفي الخادم قبل إرسال القالب إلى Meta.

export type TemplateCategory = "MARKETING" | "UTILITY"
export type HeaderFormat = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"
export type TemplateButton =
  | { type: "QUICK_REPLY"; text: string }
  | { type: "URL"; text: string; url: string; example: string }
  | { type: "PHONE_NUMBER"; text: string; phone: string }

export type TemplateDraft = {
  name: string
  language: string
  category: TemplateCategory
  headerFormat: HeaderFormat
  headerText: string
  headerExample: string
  body: string
  bodyExamples: string[]
  footer: string
  buttons: TemplateButton[]
}

export const LIMITS = {
  name: 512,
  headerText: 60,
  body: 1024,
  footer: 60,
  buttonText: 25,
  url: 2000,
  phone: 20,
  buttons: 10,
  urlButtons: 2,
  phoneButtons: 1,
  mediaBytes: { IMAGE: 5 * 1024 * 1024, VIDEO: 16 * 1024 * 1024, DOCUMENT: 100 * 1024 * 1024 },
  // حد رفع الملف عبر الموقع (حد حجم الطلب في الدوال السحابية).
  uploadBytes: 4.5 * 1024 * 1024,
} as const

export const MEDIA_TYPES: Record<"IMAGE" | "VIDEO" | "DOCUMENT", string[]> = {
  IMAGE: ["image/jpeg", "image/png"],
  VIDEO: ["video/mp4"],
  DOCUMENT: ["application/pdf"],
}

export const LANGUAGES = [
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
  { code: "en_US", label: "English (US)" },
  { code: "en_GB", label: "English (UK)" },
  { code: "fr", label: "Français" },
  { code: "tr", label: "Türkçe" },
  { code: "ur", label: "اردو" },
]

export const CATEGORIES: { value: TemplateCategory; label: string; hint: string }[] = [
  { value: "MARKETING", label: "تسويقي", hint: "عروض، تخفيضات، إعلانات، دعوات وتحديثات ترويجية." },
  { value: "UTILITY", label: "خدمي", hint: "تأكيد طلب أو موعد، تحديث حالة، فواتير وتنبيهات حساب. يجب ألا يحتوي على أي محتوى ترويجي." },
]

const VAR_RE = /\{\{\s*(\d+)\s*\}\}/g
const EMOJI_RE = /\p{Extended_Pictographic}/u

/** أرقام المتغيرات بالترتيب الذي تظهر به في النص. */
export function variablesIn(text: string) {
  return Array.from(text.matchAll(VAR_RE), (m) => Number(m[1]))
}

/** عدد المتغيرات المطلوب لها أمثلة (أعلى رقم متغير). */
export function variableCount(text: string) {
  const vars = variablesIn(text)
  return vars.length ? Math.max(...vars) : 0
}

function checkVariables(text: string, label: string, errors: string[]) {
  const vars = variablesIn(text)
  if (!vars.length) return
  const unique = [...new Set(vars)].sort((a, b) => a - b)
  if (unique.some((v, i) => v !== i + 1)) errors.push(`${label}: يجب أن تكون المتغيرات متسلسلة تبدأ من {{1}} بدون أرقام ناقصة`)
  const trimmed = text.trim()
  if (/^\{\{\s*\d+\s*\}\}/.test(trimmed)) errors.push(`${label}: لا يمكن أن يبدأ النص بمتغير`)
  if (/\{\{\s*\d+\s*\}\}\s*$/.test(trimmed)) errors.push(`${label}: لا يمكن أن ينتهي النص بمتغير`)
  if (/\}\}\s*\{\{/.test(text)) errors.push(`${label}: لا يمكن وضع متغيرين متجاورين دون نص بينهما`)
  if (/\{\{[^}]*[^\d\s}][^}]*\}\}/.test(text)) errors.push(`${label}: صيغة المتغير يجب أن تكون رقماً فقط مثل {{1}}`)
  // سياسة Meta: يجب أن يكون عدد الكلمات أكبر بوضوح من عدد المتغيرات.
  const words = text.replace(VAR_RE, " ").split(/\s+/).filter(Boolean).length
  if (words < vars.length * 2 + 1) errors.push(`${label}: عدد المتغيرات كبير مقارنة بطول النص، أضف نصاً أكثر`)
}

export function validateTemplate(d: TemplateDraft, media?: { type: string; size: number } | null) {
  const errors: string[] = []

  if (!d.name) errors.push("اسم القالب مطلوب")
  else if (!/^[a-z0-9_]+$/.test(d.name)) errors.push("اسم القالب: أحرف إنجليزية صغيرة وأرقام وشرطة سفلية (_) فقط")
  else if (d.name.length > LIMITS.name) errors.push(`اسم القالب: الحد الأقصى ${LIMITS.name} حرفاً`)
  if (!d.language) errors.push("اختر لغة القالب")
  if (d.category !== "MARKETING" && d.category !== "UTILITY") errors.push("اختر فئة القالب")

  // الترويسة
  if (d.headerFormat === "TEXT") {
    const h = d.headerText.trim()
    if (!h) errors.push("نص الترويسة مطلوب أو اختر «بدون ترويسة»")
    if (h.length > LIMITS.headerText) errors.push(`الترويسة: الحد الأقصى ${LIMITS.headerText} حرفاً`)
    if (/[\n*_~`]/.test(h)) errors.push("الترويسة: لا يُسمح بأسطر جديدة أو رموز التنسيق (* _ ~)")
    if (EMOJI_RE.test(h)) errors.push("الترويسة: لا يُسمح بالرموز التعبيرية (Emoji)")
    const hv = variablesIn(h)
    if (hv.length > 1) errors.push("الترويسة: يُسمح بمتغير واحد فقط {{1}}")
    if (hv.length === 1 && hv[0] !== 1) errors.push("الترويسة: المتغير يجب أن يكون {{1}}")
    if (hv.length === 1 && !d.headerExample.trim()) errors.push("الترويسة: أدخل مثالاً لقيمة المتغير {{1}}")
  } else if (d.headerFormat !== "NONE") {
    if (!media) errors.push("الترويسة: ارفع ملف مثال (مطلوب لمراجعة Meta)")
    else {
      const allowed = MEDIA_TYPES[d.headerFormat]
      if (!allowed.includes(media.type)) errors.push(`الترويسة: نوع الملف غير مدعوم (المسموح: ${allowed.join(", ")})`)
      const max = Math.min(LIMITS.mediaBytes[d.headerFormat], LIMITS.uploadBytes)
      if (media.size > max) errors.push(`الترويسة: حجم الملف أكبر من ${(max / 1024 / 1024).toFixed(1)} ميجابايت`)
    }
  }

  // المحتوى
  const body = d.body
  if (!body.trim()) errors.push("نص الرسالة مطلوب")
  if (body.length > LIMITS.body) errors.push(`نص الرسالة: الحد الأقصى ${LIMITS.body} حرفاً`)
  if (/\n{3,}/.test(body)) errors.push("نص الرسالة: لا يُسمح بأكثر من سطر فارغ واحد متتالٍ")
  if (/ {5,}|\t/.test(body)) errors.push("نص الرسالة: لا يُسمح بأكثر من 4 مسافات متتالية أو علامات Tab")
  checkVariables(body, "نص الرسالة", errors)
  const count = variableCount(body)
  for (let i = 0; i < count; i++) {
    if (!d.bodyExamples[i]?.trim()) errors.push(`أدخل مثالاً لقيمة المتغير {{${i + 1}}}`)
  }

  // التذييل
  if (d.footer.length > LIMITS.footer) errors.push(`التذييل: الحد الأقصى ${LIMITS.footer} حرفاً`)
  if (variablesIn(d.footer).length) errors.push("التذييل: لا يُسمح بالمتغيرات")

  // الأزرار
  if (d.buttons.length > LIMITS.buttons) errors.push(`الأزرار: الحد الأقصى ${LIMITS.buttons} أزرار`)
  const urls = d.buttons.filter((b) => b.type === "URL")
  const phones = d.buttons.filter((b) => b.type === "PHONE_NUMBER")
  if (urls.length > LIMITS.urlButtons) errors.push(`الأزرار: الحد الأقصى ${LIMITS.urlButtons} زر رابط`)
  if (phones.length > LIMITS.phoneButtons) errors.push("الأزرار: يُسمح بزر اتصال واحد فقط")
  // Meta تشترط أن تكون أزرار الرد السريع متجاورة (قبل أو بعد أزرار الإجراء وليس بينها).
  const kinds = d.buttons.map((b) => (b.type === "QUICK_REPLY" ? "Q" : "A")).join("")
  if (/Q+A+Q+|A+Q+A+/.test(kinds)) errors.push("الأزرار: يجب تجميع أزرار الرد السريع معاً (قبل أو بعد أزرار الرابط والاتصال)")
  const texts = new Set<string>()
  d.buttons.forEach((b, i) => {
    const n = `الزر ${i + 1}`
    if (!b.text.trim()) errors.push(`${n}: نص الزر مطلوب`)
    if (b.text.length > LIMITS.buttonText) errors.push(`${n}: الحد الأقصى ${LIMITS.buttonText} حرفاً`)
    if (texts.has(b.text.trim())) errors.push(`${n}: لا يمكن تكرار نص الزر`)
    texts.add(b.text.trim())
    if (b.type === "URL") {
      if (!/^https?:\/\/\S+\.\S+/.test(b.url)) errors.push(`${n}: رابط غير صالح (يجب أن يبدأ بـ https://)`)
      if (b.url.length > LIMITS.url) errors.push(`${n}: الرابط طويل جداً`)
      const uv = variablesIn(b.url)
      if (uv.length > 1 || (uv.length === 1 && (uv[0] !== 1 || !/\{\{\s*1\s*\}\}$/.test(b.url))))
        errors.push(`${n}: يُسمح بمتغير واحد {{1}} في نهاية الرابط فقط`)
      if (uv.length === 1 && !b.example.trim()) errors.push(`${n}: أدخل مثالاً لقيمة متغير الرابط`)
    }
    if (b.type === "PHONE_NUMBER") {
      if (!/^\+?\d{6,19}$/.test(b.phone.replace(/[\s-]/g, ""))) errors.push(`${n}: رقم هاتف غير صالح، استخدم الصيغة الدولية مثل +966500000000`)
    }
  })

  return errors
}

/** تحذيرات غير مانعة: محتوى قد يؤدي لرفض القالب أو تغيير فئته من Meta. */
export function policyWarnings(d: TemplateDraft) {
  const warnings: string[] = []
  const text = `${d.headerText} ${d.body} ${d.footer}`.toLowerCase()
  if (d.category === "UTILITY" && /(خصم|عرض|تخفيض|مجاني|اشترِ|اشتر |كوبون|discount|offer|sale|free|promo|coupon)/i.test(text))
    warnings.push("القالب الخدمي يحتوي على كلمات ترويجية؛ قد تعيد Meta تصنيفه كقالب تسويقي.")
  if (/(bit\.ly|tinyurl|goo\.gl|t\.co\/)/i.test(text + d.buttons.map((b) => ("url" in b ? b.url : "")).join(" ")))
    warnings.push("تجنب الروابط المختصرة؛ Meta ترفض القوالب التي تخفي الوجهة الحقيقية للرابط.")
  if (/(كلمة المرور|رمز التحقق|password|otp|verification code)/i.test(text))
    warnings.push("لا تطلب كلمات مرور أو بيانات حساسة؛ رموز التحقق لها فئة مصادقة خاصة.")
  if (d.category === "MARKETING" && !/(إلغاء|stop|توقف)/i.test(`${d.footer} ${d.buttons.map((b) => b.text).join(" ")}`))
    warnings.push("يُفضّل إضافة خيار لإلغاء الاشتراك في الرسائل التسويقية (مثل زر «إيقاف العروض»).")
  return warnings
}

/** يحوّل المسودة إلى مكونات API الخاصة بـ Meta. headerHandle مطلوب لترويسة الوسائط. */
export function toMetaComponents(d: TemplateDraft, headerHandle?: string) {
  const components: any[] = []
  if (d.headerFormat === "TEXT") {
    const header: any = { type: "HEADER", format: "TEXT", text: d.headerText.trim() }
    if (variablesIn(d.headerText).length) header.example = { header_text: [d.headerExample.trim()] }
    components.push(header)
  } else if (d.headerFormat !== "NONE" && headerHandle) {
    components.push({ type: "HEADER", format: d.headerFormat, example: { header_handle: [headerHandle] } })
  }
  const body: any = { type: "BODY", text: d.body.trim() }
  const count = variableCount(d.body)
  if (count) body.example = { body_text: [d.bodyExamples.slice(0, count).map((e) => e.trim())] }
  components.push(body)
  if (d.footer.trim()) components.push({ type: "FOOTER", text: d.footer.trim() })
  if (d.buttons.length) {
    components.push({
      type: "BUTTONS",
      buttons: d.buttons.map((b) => {
        if (b.type === "URL") {
          const btn: any = { type: "URL", text: b.text.trim(), url: b.url.trim() }
          if (variablesIn(b.url).length) btn.example = [b.example.trim()]
          return btn
        }
        if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text.trim(), phone_number: b.phone.replace(/[\s-]/g, "") }
        return { type: "QUICK_REPLY", text: b.text.trim() }
      }),
    })
  }
  return components
}

// ---------- الصلاحية والتنبيهات أثناء الإرسال ----------

/** حالات قوالب Meta التي لا يمكن الإرسال بها. */
const BLOCKED_STATUSES: Record<string, string> = {
  PAUSED: "تم إيقاف هذا القالب مؤقتاً من Meta بسبب انخفاض الجودة",
  DISABLED: "تم تعطيل هذا القالب نهائياً من Meta",
  REJECTED: "تم رفض هذا القالب من Meta",
  ARCHIVED: "هذا القالب مؤرشف",
  DELETED: "تم حذف هذا القالب",
  PENDING_DELETION: "هذا القالب قيد الحذف",
  LIMIT_EXCEEDED: "تجاوز هذا القالب حد الاستخدام المسموح",
}
const PENDING_STATUSES: Record<string, string> = {
  PENDING: "هذا القالب ما زال قيد المراجعة لدى Meta",
  IN_APPEAL: "هذا القالب قيد الاستئناف لدى Meta",
}

export const TEMPLATE_STATUS_LABELS: Record<string, string> = {
  APPROVED: "معتمد",
  PENDING: "قيد المراجعة",
  IN_APPEAL: "قيد الاستئناف",
  REJECTED: "مرفوض",
  PAUSED: "موقوف مؤقتاً",
  DISABLED: "معطّل",
  ARCHIVED: "مؤرشف",
  DELETED: "محذوف",
  PENDING_DELETION: "قيد الحذف",
  LIMIT_EXCEEDED: "تجاوز الحد",
}

/** هل انتهت صلاحية القالب (لا يمكن الإرسال به)؟ */
export function templateValidity(status: string | undefined | null) {
  const s = String(status || "").toUpperCase()
  if (!s || s === "APPROVED") return { usable: true as const, expired: false, message: null }
  if (BLOCKED_STATUSES[s]) return { usable: false as const, expired: true, message: `${BLOCKED_STATUSES[s]}، ولا يمكن الإرسال به. اختر قالباً آخر معتمداً.` }
  if (PENDING_STATUSES[s]) return { usable: false as const, expired: false, message: `${PENDING_STATUSES[s]}، ولا يمكن الإرسال به حتى يتم اعتماده.` }
  return { usable: false as const, expired: true, message: `حالة القالب «${s}» لا تسمح بالإرسال. اختر قالباً آخر معتمداً.` }
}

/** معرّف الوسائط (Media ID) في واتساب صالح لمدة 30 يوماً من الرفع. */
export const MEDIA_ID_TTL_DAYS = 30

export function mediaValidity(uploadedAt: string | null | undefined) {
  if (!uploadedAt) return { expired: false, daysLeft: null as number | null, expiresAt: null as Date | null }
  const expiresAt = new Date(new Date(uploadedAt).getTime() + MEDIA_ID_TTL_DAYS * 24 * 60 * 60 * 1000)
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  return { expired: daysLeft <= 0, daysLeft, expiresAt }
}
