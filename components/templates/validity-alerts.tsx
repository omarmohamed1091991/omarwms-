"use client"

import { AlertTriangle, Clock, ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { TEMPLATE_STATUS_LABELS, mediaValidity, templateValidity } from "@/lib/template-rules"

/** شارة صغيرة بجوار اسم القالب في قوائم الاختيار عندما لا يكون معتمداً. */
export function TemplateStatusBadge({ status, className }: { status?: string; className?: string }) {
  const v = templateValidity(status)
  if (v.usable) return null
  const s = String(status || "").toUpperCase()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        v.expired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
        className,
      )}
    >
      {v.expired ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {v.expired ? "منتهي الصلاحية" : TEMPLATE_STATUS_LABELS[s] || s}
    </span>
  )
}

/** تنبيه بارز عند اختيار قالب منتهي الصلاحية أو غير معتمد. */
export function TemplateValidityAlert({ template }: { template?: { name: string; status?: string } | null }) {
  if (!template) return null
  const v = templateValidity(template.status)
  if (v.usable) return null
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border-2 p-4 text-sm",
        v.expired ? "border-red-300 bg-red-50 text-red-800" : "border-amber-300 bg-amber-50 text-amber-900",
      )}
    >
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-bold">{v.expired ? `انتهت صلاحية القالب «${template.name}»` : `القالب «${template.name}» غير معتمد بعد`}</p>
        <p className="mt-1">{v.message}</p>
      </div>
    </div>
  )
}

/** شارة على الصورة في مكتبة الاختيار: منتهية أو قاربت على الانتهاء. */
export function MediaExpiryBadge({ uploadedAt }: { uploadedAt?: string | null }) {
  const v = mediaValidity(uploadedAt)
  if (v.daysLeft === null || v.daysLeft > 5) return null
  return (
    <span
      className={cn(
        "absolute top-1 right-1 z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow",
        v.expired ? "bg-red-600 text-white" : "bg-amber-400 text-amber-950",
      )}
    >
      {v.expired ? <ImageOff className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {v.expired ? "منتهية" : `${v.daysLeft} يوم`}
    </span>
  )
}

/** تنبيه عند اختيار صورة انتهت صلاحية معرّفها في واتساب (30 يوماً من الرفع). */
export function MediaExpiryAlert({ media }: { media?: { file_name?: string | null; uploaded_at?: string | null } | null }) {
  if (!media) return null
  const v = mediaValidity(media.uploaded_at)
  if (v.daysLeft === null || v.daysLeft > 5) return null
  const name = media.file_name ? `«${media.file_name}»` : "المختارة"
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border-2 p-4 text-sm",
        v.expired ? "border-red-300 bg-red-50 text-red-800" : "border-amber-300 bg-amber-50 text-amber-900",
      )}
    >
      <ImageOff className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-bold">{v.expired ? `انتهت صلاحية الصورة ${name}` : `صلاحية الصورة ${name} تنتهي قريباً`}</p>
        <p className="mt-1">
          {v.expired
            ? "واتساب يحتفظ بالصور المرفوعة لمدة 30 يوماً فقط، وانتهت هذه المدة فلن تصل الرسالة. ارفع الصورة مرة أخرى من مكتبة الصور ثم اخترها."
            : `متبقٍ ${v.daysLeft} يوم على انتهاء صلاحيتها في واتساب. يُفضّل رفعها من جديد قبل الحملات الكبيرة.`}
        </p>
      </div>
    </div>
  )
}
