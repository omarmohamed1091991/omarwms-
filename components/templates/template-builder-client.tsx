"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  FileText,
  ImageIcon,
  Info,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  Reply,
  Send,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { isImageFile, normalizeImageForUpload } from "@/lib/image-normalize"
import { TemplateStatusBadge } from "@/components/templates/validity-alerts"
import {
  CATEGORIES,
  LANGUAGES,
  LIMITS,
  MEDIA_TYPES,
  TEMPLATE_STATUS_LABELS,
  policyWarnings,
  validateTemplate,
  variableCount,
  variablesIn,
  type HeaderFormat,
  type TemplateButton,
  type TemplateDraft,
} from "@/lib/template-rules"

type MetaTemplate = {
  id: string
  name: string
  language: string
  status: string
  category: string
  rejected_reason?: string
  components: any[]
}

const emptyDraft: TemplateDraft = {
  name: "",
  language: "ar",
  category: "MARKETING",
  headerFormat: "NONE",
  headerText: "",
  headerExample: "",
  body: "",
  bodyExamples: [],
  footer: "",
  buttons: [],
}

const HEADER_OPTIONS: { value: HeaderFormat; label: string; icon: ReactNode }[] = [
  { value: "NONE", label: "بدون", icon: <X className="w-4 h-4" /> },
  { value: "TEXT", label: "نص", icon: <FileText className="w-4 h-4" /> },
  { value: "IMAGE", label: "صورة", icon: <ImageIcon className="w-4 h-4" /> },
  { value: "VIDEO", label: "فيديو", icon: <Video className="w-4 h-4" /> },
  { value: "DOCUMENT", label: "مستند", icon: <FileText className="w-4 h-4" /> },
]

/** تنسيق واتساب: *عريض* _مائل_ ~يتوسطه خط~ ```أحادي المسافة``` */
function formatWhatsApp(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(```[^`]+```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g
  let last = 0
  let i = 0
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const inner = t.startsWith("```") ? t.slice(3, -3) : t.slice(1, -1)
    if (t.startsWith("```")) out.push(<code key={i++} className="font-mono text-[13px]">{inner}</code>)
    else if (t[0] === "*") out.push(<strong key={i++}>{inner}</strong>)
    else if (t[0] === "_") out.push(<em key={i++}>{inner}</em>)
    else out.push(<s key={i++}>{inner}</s>)
    last = m.index! + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** يستبدل المتغيرات بالأمثلة، أو يعرضها مميزة إن لم يُدخل مثال بعد. */
function renderWithSamples(text: string, samples: string[]): ReactNode[] {
  const parts = text.split(/(\{\{\s*\d+\s*\}\})/g)
  return parts.flatMap((part, idx) => {
    const m = part.match(/^\{\{\s*(\d+)\s*\}\}$/)
    if (!m) return formatWhatsApp(part).map((n, j) => <span key={`${idx}-${j}`}>{n}</span>)
    const sample = samples[Number(m[1]) - 1]?.trim()
    return sample ? (
      <span key={idx} className="bg-emerald-100/70 rounded px-0.5">
        {sample}
      </span>
    ) : (
      <span key={idx} className="bg-amber-100 text-amber-800 rounded px-1 font-mono text-xs">
        {`{{${m[1]}}}`}
      </span>
    )
  })
}

function Counter({ value, max }: { value: number; max: number }) {
  return <span className={cn("text-[11px]", value > max ? "text-red-600 font-semibold" : "text-gray-400")}>{value}/{max}</span>
}

export function TemplateBuilderClient({ userId }: { userId: string }) {
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft)
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [preparingFile, setPreparingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [templates, setTemplates] = useState<MetaTemplate[] | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const set = <K extends keyof TemplateDraft>(key: K, value: TemplateDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const bodyVarCount = variableCount(draft.body)
  const headerHasVar = draft.headerFormat === "TEXT" && variablesIn(draft.headerText).length > 0
  const errors = useMemo(() => validateTemplate(draft, file ? { type: file.type, size: file.size } : null), [draft, file])
  const warnings = useMemo(() => policyWarnings(draft), [draft])

  useEffect(() => {
    if (!file || (!file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
      setFilePreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function handleHeaderFile(picked: File | null) {
    setFileError(null)
    if (!picked || draft.headerFormat !== "IMAGE" || !isImageFile(picked)) {
      setFile(picked)
      return
    }
    setPreparingFile(true)
    try {
      setFile(await normalizeImageForUpload(picked))
    } catch (err) {
      setFile(null)
      setFileError(err instanceof Error ? err.message : "تعذّر تجهيز الصورة")
    } finally {
      setPreparingFile(false)
    }
  }

  async function loadTemplates() {
    setLoadingList(true)
    setListError(null)
    try {
      const res = await fetch(`/api/templates?userId=${encodeURIComponent(userId)}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTemplates(data.templates)
    } catch (e) {
      setListError(e instanceof Error ? e.message : "فشل جلب القوالب")
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function insertVariable() {
    const n = bodyVarCount + 1
    const token = `{{${n}}}`
    const el = bodyRef.current
    const start = el?.selectionStart ?? draft.body.length
    const end = el?.selectionEnd ?? draft.body.length
    const next = draft.body.slice(0, start) + token + draft.body.slice(end)
    set("body", next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  function wrapSelection(mark: string) {
    const el = bodyRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const selected = draft.body.slice(s, e) || "نص"
    set("body", draft.body.slice(0, s) + mark + selected + mark + draft.body.slice(e))
    requestAnimationFrame(() => el.focus())
  }

  function setExample(i: number, value: string) {
    const next = [...draft.bodyExamples]
    next[i] = value
    set("bodyExamples", next)
  }

  function addButton(type: TemplateButton["type"]) {
    const btn: TemplateButton =
      type === "URL"
        ? { type, text: "", url: "https://", example: "" }
        : type === "PHONE_NUMBER"
          ? { type, text: "", phone: "+" }
          : { type, text: "" }
    // نضيف أزرار الرد السريع بجوار بعضها حتى تبقى مجمّعة وفق قواعد Meta.
    const buttons = [...draft.buttons]
    if (type === "QUICK_REPLY") {
      const lastQ = buttons.map((b) => b.type).lastIndexOf("QUICK_REPLY")
      buttons.splice(lastQ === -1 ? 0 : lastQ + 1, 0, btn)
    } else buttons.push(btn)
    set("buttons", buttons)
  }

  function updateButton(i: number, patch: Partial<TemplateButton>) {
    set(
      "buttons",
      draft.buttons.map((b, j) => (j === i ? ({ ...b, ...patch } as TemplateButton) : b)),
    )
  }

  async function submit() {
    setShowErrors(true)
    setSubmitError(null)
    setSuccess(null)
    if (errors.length) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("userId", userId)
      fd.append("draft", JSON.stringify({ ...draft, bodyExamples: draft.bodyExamples.slice(0, bodyVarCount) }))
      if (file && draft.headerFormat !== "NONE" && draft.headerFormat !== "TEXT") fd.append("file", file)
      const res = await fetch("/api/templates", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "تعذر إنشاء القالب")
      const status = TEMPLATE_STATUS_LABELS[String(data.status || "PENDING").toUpperCase()] || data.status
      setSuccess(`تم إرسال القالب «${draft.name}» إلى Meta للمراجعة. الحالة الحالية: ${status}. تستغرق المراجعة عادة من دقائق حتى 24 ساعة.`)
      setDraft(emptyDraft)
      setFile(null)
      setShowErrors(false)
      loadTemplates()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "تعذر إنشاء القالب")
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(name: string) {
    if (!confirm(`حذف القالب «${name}» من حساب واتساب؟ لا يمكن إنشاء قالب بنفس الاسم لمدة 30 يوماً.`)) return
    const res = await fetch(`/api/templates?userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(name)}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data.error || "فشل حذف القالب")
    loadTemplates()
  }

  const mediaHeader = draft.headerFormat === "IMAGE" || draft.headerFormat === "VIDEO" || draft.headerFormat === "DOCUMENT"
  const time = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1">إنشاء قوالب واتساب</h2>
        <p className="text-gray-600 text-sm">أنشئ قالباً متوافقاً مع سياسات Meta وشاهد شكله النهائي أثناء الكتابة، ثم أرسله للمراجعة.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* النموذج */}
        <div className="xl:col-span-3 space-y-5">
          {/* البيانات الأساسية */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-900">البيانات الأساسية</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>اسم القالب *</Label>
                  <Counter value={draft.name.length} max={LIMITS.name} />
                </div>
                <Input
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, ""))}
                  placeholder="order_confirmation"
                  dir="ltr"
                  className="font-mono"
                />
                <p className="text-[11px] text-gray-500">أحرف إنجليزية صغيرة وأرقام و _ فقط.</p>
              </div>
              <div className="space-y-1.5">
                <Label>اللغة *</Label>
                <select
                  value={draft.language}
                  onChange={(e) => set("language", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} ({l.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>الفئة *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => set("category", c.value)}
                    className={cn(
                      "rounded-xl border-2 p-3 text-right transition-all",
                      draft.category === c.value ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-emerald-200",
                    )}
                  >
                    <p className="font-semibold text-sm text-slate-900">{c.label}</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{c.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* الترويسة */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900">الترويسة <span className="text-xs font-normal text-gray-400">(اختياري)</span></h3>
              <p className="text-xs text-gray-500">عنوان أو وسائط تظهر أعلى الرسالة.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {HEADER_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    set("headerFormat", o.value)
                    setFile(null)
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm",
                    draft.headerFormat === o.value ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-emerald-200",
                  )}
                >
                  {o.icon}
                  {o.label}
                </button>
              ))}
            </div>
            {draft.headerFormat === "TEXT" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>نص الترويسة</Label>
                    <Counter value={draft.headerText.length} max={LIMITS.headerText} />
                  </div>
                  <Input value={draft.headerText} onChange={(e) => set("headerText", e.target.value)} placeholder="تأكيد طلبك رقم {{1}}" />
                  <p className="text-[11px] text-gray-500">بدون رموز تعبيرية أو تنسيق. يُسمح بمتغير واحد {"{{1}}"}.</p>
                </div>
                {headerHasVar && (
                  <div className="space-y-1.5">
                    <Label>مثال لقيمة {"{{1}}"} في الترويسة</Label>
                    <Input value={draft.headerExample} onChange={(e) => set("headerExample", e.target.value)} placeholder="12345" />
                  </div>
                )}
              </div>
            )}
            {mediaHeader && (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-700">{preparingFile ? "جاري تجهيز الصورة..." : file ? file.name : "ارفع ملف مثال للمراجعة"}</span>
                  <span className="text-[11px] text-slate-500">
                    {draft.headerFormat === "IMAGE"
                      ? "أي صيغة صورة وبأي مقاس · تُحوَّل إلى JPG وتُضغط تلقائياً"
                      : `${MEDIA_TYPES[draft.headerFormat as "IMAGE"].join("، ")} · حتى ${(LIMITS.uploadBytes / 1024 / 1024).toFixed(1)} ميجابايت`}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept={draft.headerFormat === "IMAGE" ? "image/*,.heic,.heif" : MEDIA_TYPES[draft.headerFormat as "IMAGE"].join(",")}
                    disabled={preparingFile}
                    onChange={(e) => {
                      void handleHeaderFile(e.target.files?.[0] ?? null)
                      e.target.value = ""
                    }}
                  />
                </label>
                {fileError && <p className="text-xs text-red-600">{fileError}</p>}
                <p className="text-[11px] text-gray-500">
                  هذا الملف مثال تستخدمه Meta لمراجعة القالب فقط؛ عند الإرسال تختار الصورة الفعلية من مكتبة الصور.
                </p>
              </div>
            )}
          </section>

          {/* المحتوى */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900">نص الرسالة *</h3>
              <div className="flex items-center gap-1">
                <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0 font-bold" onClick={() => wrapSelection("*")} title="عريض">
                  B
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0 italic" onClick={() => wrapSelection("_")} title="مائل">
                  I
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0 line-through" onClick={() => wrapSelection("~")} title="يتوسطه خط">
                  S
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={insertVariable}>
                  <Plus className="w-3.5 h-3.5" /> متغير
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Textarea
                ref={bodyRef}
                rows={7}
                value={draft.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder={"مرحباً {{1}}،\nتم تأكيد طلبك رقم {{2}} وسيصلك خلال 3 أيام عمل.\nشكراً لتسوقك معنا."}
                className="leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-500">المتغيرات {"{{1}}"}، {"{{2}}"}… متسلسلة، ولا يبدأ أو ينتهي النص بمتغير.</p>
                <Counter value={draft.body.length} max={LIMITS.body} />
              </div>
            </div>
            {bodyVarCount > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-800">أمثلة للمتغيرات (مطلوبة لمراجعة Meta)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: bodyVarCount }, (_, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-xs font-mono">{`{{${i + 1}}}`}</Label>
                      <Input value={draft.bodyExamples[i] || ""} onChange={(e) => setExample(i, e.target.value)} placeholder={i === 0 ? "أحمد" : "مثال"} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* التذييل */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">التذييل <span className="text-xs font-normal text-gray-400">(اختياري)</span></h3>
              <Counter value={draft.footer.length} max={LIMITS.footer} />
            </div>
            <Input value={draft.footer} onChange={(e) => set("footer", e.target.value)} placeholder="للإلغاء أرسل «توقف»" />
          </section>

          {/* الأزرار */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-bold text-slate-900">الأزرار <span className="text-xs font-normal text-gray-400">(اختياري)</span></h3>
                <p className="text-xs text-gray-500">حتى 10 أزرار: رد سريع، رابطان كحد أقصى، وزر اتصال واحد.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1" disabled={draft.buttons.length >= LIMITS.buttons} onClick={() => addButton("QUICK_REPLY")}>
                  <Reply className="w-3.5 h-3.5" /> رد سريع
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  disabled={draft.buttons.length >= LIMITS.buttons || draft.buttons.filter((b) => b.type === "URL").length >= LIMITS.urlButtons}
                  onClick={() => addButton("URL")}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> رابط
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  disabled={draft.buttons.length >= LIMITS.buttons || draft.buttons.some((b) => b.type === "PHONE_NUMBER")}
                  onClick={() => addButton("PHONE_NUMBER")}
                >
                  <Phone className="w-3.5 h-3.5" /> اتصال
                </Button>
              </div>
            </div>
            {draft.buttons.map((b, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    {b.type === "QUICK_REPLY" ? "رد سريع" : b.type === "URL" ? "زر رابط" : "زر اتصال"}
                  </span>
                  <button type="button" onClick={() => set("buttons", draft.buttons.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700" aria-label="حذف الزر">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Input value={b.text} onChange={(e) => updateButton(i, { text: e.target.value })} placeholder="نص الزر" />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2">
                      <Counter value={b.text.length} max={LIMITS.buttonText} />
                    </span>
                  </div>
                  {b.type === "URL" && (
                    <Input value={b.url} onChange={(e) => updateButton(i, { url: e.target.value })} placeholder="https://example.com/order/{{1}}" dir="ltr" />
                  )}
                  {b.type === "PHONE_NUMBER" && (
                    <Input value={b.phone} onChange={(e) => updateButton(i, { phone: e.target.value })} placeholder="+966500000000" dir="ltr" />
                  )}
                </div>
                {b.type === "URL" && variablesIn(b.url).length > 0 && (
                  <Input value={b.example} onChange={(e) => updateButton(i, { example: e.target.value })} placeholder="مثال لقيمة {{1}} في الرابط، مثل 12345" dir="ltr" />
                )}
              </div>
            ))}
          </section>

          {/* الأخطاء والتحذيرات */}
          {showErrors && errors.length > 0 && (
            <div role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-1">
              <p className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> يجب تصحيح ما يلي قبل الإرسال:
              </p>
              <ul className="list-disc pr-5 space-y-0.5">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-2">
                <Info className="w-4 h-4" /> ملاحظات سياسات Meta
              </p>
              <ul className="list-disc pr-5 space-y-0.5">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {submitError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}
          {success && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              {success}
            </p>
          )}

          <Button onClick={submit} disabled={submitting} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Send className="w-5 h-5 ml-2" />}
            {submitting ? "جاري الإرسال إلى Meta..." : "إرسال القالب للمراجعة"}
          </Button>
        </div>

        {/* المعاينة */}
        <aside className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-3">
            <p className="text-sm font-semibold text-slate-700">المعاينة المباشرة</p>
            <div className="rounded-[2rem] border-8 border-slate-900 bg-slate-900 shadow-2xl overflow-hidden max-w-sm mx-auto">
              <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">O</div>
                <div>
                  <p className="text-sm font-semibold leading-tight">نشاطك التجاري</p>
                  <p className="text-[10px] text-white/70">حساب أعمال</p>
                </div>
              </div>
              <div
                className="min-h-[420px] p-3 bg-[#ECE5DD]"
                style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
                dir={draft.language.startsWith("ar") || draft.language === "ur" ? "rtl" : "ltr"}
              >
                <div className="max-w-[88%] rounded-lg rounded-tr-none bg-white shadow-sm overflow-hidden">
                  {mediaHeader && (
                    <div className="p-1">
                      {filePreview && draft.headerFormat === "IMAGE" ? (
                        <img src={filePreview} alt="معاينة الترويسة" className="w-full max-h-48 object-cover rounded-md" />
                      ) : filePreview && draft.headerFormat === "VIDEO" ? (
                        <video src={filePreview} className="w-full max-h-48 rounded-md" muted />
                      ) : (
                        <div className="h-32 rounded-md bg-slate-200 flex flex-col items-center justify-center text-slate-500 gap-1">
                          {draft.headerFormat === "IMAGE" ? <ImageIcon className="w-8 h-8" /> : draft.headerFormat === "VIDEO" ? <Video className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                          <span className="text-[11px]">{file?.name || (draft.headerFormat === "DOCUMENT" ? "مستند PDF" : "الوسائط")}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="px-3 pt-2 pb-1.5 text-[14px] text-slate-900 leading-relaxed">
                    {draft.headerFormat === "TEXT" && draft.headerText && (
                      <p className="font-bold mb-1">{renderWithSamples(draft.headerText, [draft.headerExample])}</p>
                    )}
                    {draft.body ? (
                      <p className="whitespace-pre-wrap break-words">{renderWithSamples(draft.body, draft.bodyExamples)}</p>
                    ) : (
                      <p className="text-slate-400">اكتب نص الرسالة لتظهر المعاينة هنا…</p>
                    )}
                    {draft.footer && <p className="text-[12px] text-slate-500 mt-1">{draft.footer}</p>}
                    <p className="text-[10px] text-slate-400 text-left mt-0.5 flex items-center justify-end gap-1" dir="ltr">
                      {time} <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                    </p>
                  </div>
                  {draft.buttons.length > 0 && (
                    <div className="border-t border-slate-100">
                      {(draft.buttons.length > 3 ? draft.buttons.slice(0, 2) : draft.buttons).map((b, i) => (
                        <div key={i} className="flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-sky-600 border-b last:border-b-0 border-slate-100">
                          {b.type === "URL" ? <ExternalLink className="w-3.5 h-3.5" /> : b.type === "PHONE_NUMBER" ? <Phone className="w-3.5 h-3.5" /> : <Reply className="w-3.5 h-3.5" />}
                          {b.text || "نص الزر"}
                        </div>
                      ))}
                      {draft.buttons.length > 3 && (
                        <div className="flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-sky-600">عرض كل الخيارات</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs">
              {errors.length === 0 ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> القالب مطابق لقواعد Meta الأساسية
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="w-4 h-4" /> {errors.length} ملاحظة يجب تصحيحها
                </span>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* القوالب الحالية */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900">قوالبك في واتساب</h3>
            <p className="text-xs text-gray-500">حالة كل قالب كما تظهر في Meta.</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadTemplates} disabled={loadingList} className="gap-1.5">
            <RefreshCw className={cn("w-4 h-4", loadingList && "animate-spin")} /> تحديث
          </Button>
        </div>
        {listError && <p className="text-sm text-red-600">{listError}</p>}
        {!listError && templates === null && <p className="text-sm text-gray-500">جاري التحميل…</p>}
        {templates && templates.length === 0 && <p className="text-sm text-gray-500">لا توجد قوالب بعد.</p>}
        {templates && templates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {templates.map((t) => {
              const body = t.components?.find((c: any) => c.type === "BODY")?.text || ""
              const approved = String(t.status).toUpperCase() === "APPROVED"
              return (
                <div key={t.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-sm text-slate-900 truncate">{t.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {t.language} · {t.category === "MARKETING" ? "تسويقي" : t.category === "UTILITY" ? "خدمي" : t.category}
                      </p>
                    </div>
                    {approved ? (
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700">معتمد</span>
                    ) : (
                      <TemplateStatusBadge status={t.status} />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 whitespace-pre-wrap">{body}</p>
                  {t.rejected_reason && t.rejected_reason !== "NONE" && (
                    <p className="text-[11px] text-red-600">سبب الرفض: {t.rejected_reason}</p>
                  )}
                  <button type="button" onClick={() => remove(t.name)} className="text-[11px] text-red-600 hover:underline flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
