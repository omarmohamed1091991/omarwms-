"use client"

import { useMemo, useRef, useState, useTransition, type ReactNode } from "react"
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Star,
  Stethoscope,
  Trash2,
  User,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  APPOINTMENT_VARIABLES,
  COUNTRY_CODES,
  DEFAULT_APPOINTMENT_TEMPLATE,
  extractMetaPlaceholders,
  formatAppointmentDate,
  formatAppointmentTime,
  normalizePhone,
  renderAppointmentMessage,
  type AppointmentValues,
} from "@/lib/appointments"
import {
  deleteAppointmentTemplate,
  fetchMetaTemplates,
  saveAppointmentTemplate,
  sendAppointmentConfirmation,
  type MetaTemplateSummary,
} from "@/app/users/[userId]/appointments/actions"

type Template = {
  id: number
  name: string
  body: string
  metaTemplateName: string | null
  metaLanguage: string | null
  paramMap: Record<string, string>
  isDefault: boolean
  updatedAt: string
}

type LogItem = {
  id: number
  patientName: string
  patientPhone: string
  appointmentDate: string
  appointmentTime: string
  doctorName: string
  messageText: string
  status: string
  error: string | null
  createdAt: string
}

type Draft = {
  id?: number
  name: string
  body: string
  metaTemplateName: string | null
  metaLanguage: string | null
  paramMap: Record<string, string>
  isDefault: boolean
}

const emptyDraft = (): Draft => ({ ...DEFAULT_APPOINTMENT_TEMPLATE, metaTemplateName: null, metaLanguage: null, paramMap: {}, isDefault: false })

const selectClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"

export function AppointmentsClient({
  userId,
  canSend,
  initialTemplates,
  initialMessages,
}: {
  userId: string
  canSend: boolean
  initialTemplates: Template[]
  initialMessages: LogItem[]
}) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [log, setLog] = useState<LogItem[]>(initialMessages)

  // نموذج الإرسال
  const defaultTemplate = initialTemplates.find((t) => t.isDefault) ?? initialTemplates[0]
  const [templateId, setTemplateId] = useState<number | null>(defaultTemplate?.id ?? null)
  const [body, setBody] = useState(defaultTemplate?.body ?? DEFAULT_APPOINTMENT_TEMPLATE.body)
  const [patientName, setPatientName] = useState("")
  const [phone, setPhone] = useState("")
  const [countryCode, setCountryCode] = useState("966")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [doctor, setDoctor] = useState("")
  const [sending, startSending] = useTransition()
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // محرر القوالب
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplateSummary[] | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const selected = templates.find((t) => t.id === templateId) ?? null
  const isMeta = !!selected?.metaTemplateName
  const normalizedPhone = normalizePhone(phone, countryCode)
  const values: AppointmentValues = {
    name: patientName,
    phone: normalizedPhone ? `+${normalizedPhone}` : "",
    date: formatAppointmentDate(date),
    time: formatAppointmentTime(time),
    doctor,
  }
  const preview = renderAppointmentMessage(isMeta ? selected!.body : body, values, selected?.paramMap)

  const loadTemplate = (id: number | null) => {
    setTemplateId(id)
    const t = templates.find((x) => x.id === id)
    setBody(t?.body ?? DEFAULT_APPOINTMENT_TEMPLATE.body)
  }

  const send = () => {
    setNotice(null)
    startSending(async () => {
      const result = await sendAppointmentConfirmation(userId, {
        templateId,
        body,
        phone: normalizedPhone,
        values: { ...values, phone: values.phone },
      }).catch(() => ({ success: false as const, error: "حدث خطأ غير متوقع" }))
      const row = "log" in result ? result.log : undefined
      if (row) setLog((prev) => [{ ...row, createdAt: new Date(row.createdAt).toISOString() }, ...prev])
      if (result.success) {
        setNotice({ type: "success", text: `تم إرسال تأكيد الموعد إلى ${patientName}` })
        setPatientName("")
        setPhone("")
        setTime("")
      } else {
        setNotice({ type: "error", text: result.error })
      }
    })
  }

  const openEditor = (t?: Template) => {
    setEditorError(null)
    setDraft(
      t
        ? { id: t.id, name: t.name, body: t.body, metaTemplateName: t.metaTemplateName, metaLanguage: t.metaLanguage, paramMap: t.paramMap, isDefault: t.isDefault }
        : { ...emptyDraft(), isDefault: templates.length === 0 },
    )
    setEditorOpen(true)
  }

  const insertVariable = (token: string) => {
    const el = bodyRef.current
    const start = el?.selectionStart ?? draft.body.length
    const end = el?.selectionEnd ?? draft.body.length
    const next = draft.body.slice(0, start) + token + draft.body.slice(end)
    setDraft({ ...draft, body: next })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const loadMetaTemplates = async () => {
    setLoadingMeta(true)
    setEditorError(null)
    const result = await fetchMetaTemplates(userId).catch(() => ({ success: false as const, error: "حدث خطأ أثناء جلب القوالب" }))
    setLoadingMeta(false)
    if (result.success) setMetaTemplates(result.templates)
    else setEditorError(result.error)
  }

  const applyMetaTemplate = (m: MetaTemplateSummary) => {
    const placeholders = extractMetaPlaceholders(m.body)
    const guess = ["name", "date", "time", "doctor", "phone"]
    setDraft({
      ...draft,
      name: draft.name === DEFAULT_APPOINTMENT_TEMPLATE.name || !draft.name ? m.name : draft.name,
      body: m.body,
      metaTemplateName: m.name,
      metaLanguage: m.language,
      paramMap: Object.fromEntries(placeholders.map((p, i) => [p, draft.paramMap[p] ?? guess[i] ?? ""])),
    })
  }

  const saveDraft = async () => {
    setSaving(true)
    setEditorError(null)
    const result = await saveAppointmentTemplate(userId, draft).catch(() => ({ success: false as const, error: "تعذّر حفظ القالب" }))
    setSaving(false)
    if (!result.success) return setEditorError(result.error)
    const saved = { ...result.template, updatedAt: new Date(result.template.updatedAt).toISOString() }
    setTemplates((prev) => {
      const rest = prev.filter((t) => t.id !== saved.id).map((t) => (saved.isDefault ? { ...t, isDefault: false } : t))
      return [saved, ...rest].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    })
    setTemplateId(saved.id)
    setBody(saved.body)
    setEditorOpen(false)
  }

  const removeTemplate = async (t: Template) => {
    if (!confirm(`حذف القالب "${t.name}"؟`)) return
    await deleteAppointmentTemplate(userId, t.id)
    setTemplates((prev) => prev.filter((x) => x.id !== t.id))
    if (templateId === t.id) loadTemplate(null)
  }

  const draftPlaceholders = useMemo(() => (draft.metaTemplateName ? extractMetaPlaceholders(draft.body) : []), [draft.body, draft.metaTemplateName])
  const sentCount = log.filter((l) => l.status === "sent").length
  const ready = canSend && patientName.trim() && normalizedPhone.length >= 10 && date && time && preview.trim()

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">تأكيد المواعيد</h1>
            <p className="text-sm text-slate-500 mt-0.5">أرسل رسائل تأكيد المواعيد للمرضى عبر واتساب باستخدام قوالب جاهزة</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Stat label="القوالب" value={templates.length} />
          <Stat label="رسائل مرسلة" value={sentCount} />
        </div>
      </div>

      {!canSend && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          الحساب غير نشط حالياً. يمكنك إدارة القوالب، لكن الإرسال يتطلب اشتراكاً فعالاً.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* نموذج الإرسال */}
        <section className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900">إرسال تأكيد موعد</h2>
            </div>
          </header>

          <div className="p-6 space-y-5">
            {/* اختيار القالب */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <Label className="text-slate-700">قالب الرسالة</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select className={selectClass} value={templateId ?? ""} onChange={(e) => loadTemplate(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">القالب الافتراضي (بدون حفظ)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.metaTemplateName ? " – قالب واتساب معتمد" : ""}
                      {t.isDefault ? " ★" : ""}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" className="shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => loadTemplate(templateId)}>
                  <Download className="w-4 h-4 ml-1.5" />
                  جلب قالب الموعد
                </Button>
              </div>
              {isMeta && (
                <p className="text-xs text-emerald-700">
                  سيُرسل كقالب واتساب معتمد ({selected!.metaTemplateName})، ولذلك يمكن إرساله لأي رقم في أي وقت.
                </p>
              )}
              {!isMeta && (
                <p className="text-xs text-slate-500">
                  الرسالة النصية الحرة تصل فقط لمن راسلك خلال آخر 24 ساعة. لإرسال التأكيد لأي مريض، اربط القالب بقالب واتساب معتمد.
                </p>
              )}
            </div>

            {/* بيانات الموعد */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field icon={User} label="اسم المريض">
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="مثال: محمد أحمد" />
              </Field>
              <Field icon={Phone} label="رقم الجوال">
                <div className="flex gap-2" dir="ltr">
                  <select className={cn(selectClass, "w-28 shrink-0")} value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} +{c.code}
                      </option>
                    ))}
                  </select>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" inputMode="tel" />
                </div>
              </Field>
              <Field icon={CalendarDays} label="التاريخ">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field icon={Clock} label="الساعة">
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field icon={Stethoscope} label="اسم الطبيب">
                  <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="مثال: د. سارة العتيبي" />
                </Field>
              </div>
            </div>

            {/* نص الرسالة */}
            {!isMeta && (
              <div className="space-y-2">
                <Label className="text-slate-700">نص الرسالة</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="leading-relaxed" />
                <VariableChips onPick={(token) => setBody((b) => `${b}${token}`)} />
              </div>
            )}

            {/* المعاينة */}
            <div className="space-y-2">
              <Label className="text-slate-700">معاينة الرسالة</Label>
              <div className="rounded-xl bg-[#e7ddd3] p-4">
                <div className="mr-auto max-w-md rounded-xl rounded-tl-none bg-[#d9fdd3] px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                  {preview || "—"}
                </div>
              </div>
            </div>

            {notice && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
                  notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700",
                )}
              >
                {notice.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                {notice.text}
              </div>
            )}

            <Button onClick={send} disabled={!ready || sending} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-base">
              {sending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
              إرسال تأكيد الموعد
            </Button>
          </div>
        </section>

        {/* القوالب */}
        <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm h-fit">
          <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900">قوالب الرسائل</h2>
            </div>
            <Button size="sm" onClick={() => openEditor()} className="bg-slate-900 hover:bg-slate-800 text-white">
              <Plus className="w-4 h-4 ml-1" />
              قالب جديد
            </Button>
          </header>
          <div className="p-4 space-y-3">
            {templates.length === 0 ? (
              <div className="text-center py-8 px-4">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">لا توجد قوالب محفوظة</p>
                <p className="text-xs text-slate-500 mt-1">أضف قالباً أو اجلب قالباً معتمداً من واتساب لإعادة استخدامه.</p>
              </div>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "group rounded-xl border p-4 transition-colors",
                    t.id === templateId ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => loadTemplate(t.id)} className="text-right flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{t.name}</span>
                        {t.isDefault && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                        {t.metaTemplateName && (
                          <span className="text-[10px] rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">واتساب معتمد</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 whitespace-pre-line">{t.body}</p>
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => openEditor(t)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="تعديل">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => removeTemplate(t)} className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mx-4 mb-4 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-700 mb-2">المتغيرات المتاحة</p>
            <div className="flex flex-wrap gap-1.5">
              {APPOINTMENT_VARIABLES.map((v) => (
                <span key={v.key} className="text-[11px] rounded-md bg-white border border-slate-200 px-2 py-1 text-slate-600">
                  <span className="font-mono text-emerald-700">{v.token}</span> {v.label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* السجل */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <CalendarCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-slate-900">آخر رسائل التأكيد</h2>
        </header>
        {log.length === 0 ? (
          <p className="text-sm text-slate-500 px-6 py-8 text-center">لم يتم إرسال أي رسائل تأكيد بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-right font-medium px-4 py-2.5">المريض</th>
                  <th className="text-right font-medium px-4 py-2.5">الجوال</th>
                  <th className="text-right font-medium px-4 py-2.5">الموعد</th>
                  <th className="text-right font-medium px-4 py-2.5">الطبيب</th>
                  <th className="text-right font-medium px-4 py-2.5">الحالة</th>
                  <th className="text-right font-medium px-4 py-2.5">وقت الإرسال</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{l.patientName}</td>
                    <td className="px-4 py-3 text-slate-600" dir="ltr">
                      +{l.patientPhone}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.appointmentDate} – {l.appointmentTime}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.doctorName || "—"}</td>
                    <td className="px-4 py-3">
                      {l.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> تم الإرسال
                        </span>
                      ) : (
                        <span title={l.error ?? ""} className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-xs">
                          <XCircle className="w-3 h-3" /> فشل
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs" suppressHydrationWarning>
                      {new Date(l.createdAt).toLocaleString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* محرر القالب */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">{draft.id ? "تعديل القالب" : "قالب رسالة جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم القالب</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-medium text-slate-800">ربط بقالب واتساب معتمد (اختياري)</p>
                <Button type="button" size="sm" variant="outline" onClick={loadMetaTemplates} disabled={loadingMeta} className="bg-white">
                  <RefreshCw className={cn("w-4 h-4 ml-1.5", loadingMeta && "animate-spin")} />
                  جلب القوالب من واتساب
                </Button>
              </div>
              {draft.metaTemplateName && (
                <div className="flex items-center justify-between rounded-lg bg-white border border-emerald-200 px-3 py-2 text-sm">
                  <span>
                    مرتبط بـ <span className="font-mono font-semibold">{draft.metaTemplateName}</span> ({draft.metaLanguage})
                  </span>
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setDraft({ ...draft, metaTemplateName: null, metaLanguage: null, paramMap: {} })}>
                    إلغاء الربط
                  </button>
                </div>
              )}
              {metaTemplates && (
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {metaTemplates.length === 0 && <p className="text-xs text-slate-500">لا توجد قوالب في حساب واتساب.</p>}
                  {metaTemplates.map((m) => (
                    <button
                      key={`${m.name}-${m.language}`}
                      type="button"
                      disabled={m.hasMediaHeader}
                      onClick={() => applyMetaTemplate(m)}
                      className={cn(
                        "w-full text-right rounded-lg border bg-white px-3 py-2 text-xs hover:border-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed",
                        draft.metaTemplateName === m.name && draft.metaLanguage === m.language ? "border-emerald-500" : "border-slate-200",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-slate-800">{m.name}</span>
                        <span className={cn("rounded-full px-2 py-0.5", m.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {m.status === "APPROVED" ? "معتمد" : m.status} · {m.language}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1 line-clamp-2">{m.hasMediaHeader ? "قالب يحتوي على وسائط – غير مدعوم هنا" : m.body}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>نص الرسالة</Label>
              <Textarea
                ref={bodyRef}
                value={draft.body}
                readOnly={!!draft.metaTemplateName}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={6}
                className={cn("leading-relaxed", draft.metaTemplateName && "bg-slate-50")}
              />
              {draft.metaTemplateName ? (
                <p className="text-xs text-slate-500">نص قالب واتساب المعتمد لا يمكن تعديله هنا، حدّد قيمة كل متغير أدناه.</p>
              ) : (
                <VariableChips onPick={insertVariable} />
              )}
            </div>

            {draftPlaceholders.length > 0 && (
              <div className="space-y-2">
                <Label>قيم متغيرات القالب</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {draftPlaceholders.map((p) => (
                    <div key={p} className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-slate-100 rounded px-2 py-1.5 shrink-0" dir="ltr">{`{{${p}}}`}</span>
                      <select
                        className={selectClass}
                        value={draft.paramMap[p] ?? ""}
                        onChange={(e) => setDraft({ ...draft, paramMap: { ...draft.paramMap, [p]: e.target.value } })}
                      >
                        <option value="">اختر المتغير</option>
                        {APPOINTMENT_VARIABLES.map((v) => (
                          <option key={v.key} value={v.key}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} className="accent-emerald-600 w-4 h-4" />
              اجعله القالب الافتراضي
            </label>

            {editorError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editorError}</p>}
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={saveDraft} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              حفظ القالب
            </Button>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function VariableChips({ onPick }: { onPick: (token: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-slate-500 ml-1">إدراج متغير:</span>
      {APPOINTMENT_VARIABLES.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => onPick(v.token)}
          className="text-xs rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-1 hover:bg-emerald-100"
        >
          + {v.label}
        </button>
      ))}
    </div>
  )
}

function Field({ icon: Icon, label, children }: { icon: typeof User; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-slate-700">
        <Icon className="w-4 h-4 text-slate-400" />
        {label}
      </Label>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center shadow-sm">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  )
}
