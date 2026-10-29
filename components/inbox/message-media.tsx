"use client"

import { useState } from "react"
import { Copy, Check, FileText, Download, KeyRound, AlertTriangle } from "lucide-react"
import { extractVerificationCode, getMediaProxyUrl } from "@/lib/whatsapp-messages"

interface MessageMediaProps {
  messageType?: string | null
  mediaUrl: string | null
  userId: string
  text?: string | null
}

export function MessageMedia({ messageType, mediaUrl, userId, text }: MessageMediaProps) {
  const [failed, setFailed] = useState(false)
  if (!mediaUrl) return null

  const src = getMediaProxyUrl(mediaUrl, userId)
  const type = messageType || "image"
  const unavailable = (
    <div className="mb-2 flex items-center gap-2 rounded-md bg-black/20 px-3 py-2 text-xs opacity-80">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      تعذّر تحميل الوسائط (قد تكون انتهت صلاحيتها لدى Meta أو رمز الوصول غير صالح)
    </div>
  )

  if (failed) return unavailable

  switch (type) {
    case "audio":
      return <audio controls preload="none" src={src} className="mb-2 w-64 max-w-full" onError={() => setFailed(true)} />
    case "video":
      return (
        <video
          controls
          preload="metadata"
          src={src}
          className="mb-2 max-h-64 w-full rounded-md"
          onError={() => setFailed(true)}
        />
      )
    case "document": {
      const name = (text || "").split("\n")[0].replace(/^📄\s*/, "") || "مستند"
      return (
        <a
          href={`${src}${src.includes("?") ? "&download=1" : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex items-center gap-3 rounded-md bg-black/20 px-3 py-2 hover:bg-black/30"
        >
          <FileText className="h-8 w-8 flex-shrink-0" />
          <span className="flex-1 truncate text-sm">{name}</span>
          <Download className="h-4 w-4 flex-shrink-0" />
        </a>
      )
    }
    case "sticker":
      return (
        <img src={src} alt="ملصق" className="mb-1 h-32 w-32 object-contain" loading="lazy" onError={() => setFailed(true)} />
      )
    case "image":
      return (
        <a href={src} target="_blank" rel="noopener noreferrer">
          <img
            src={src}
            alt="الصورة المرفقة"
            className="mb-2 max-h-64 w-full rounded-md object-contain"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </a>
      )
    default:
      return (
        <a href={src} target="_blank" rel="noopener noreferrer" className="mb-2 block text-xs underline">
          فتح المرفق
        </a>
      )
  }
}

export function VerificationCode({ text, light = false }: { text?: string | null; light?: boolean }) {
  const [copied, setCopied] = useState(false)
  const code = extractVerificationCode(text)
  if (!code) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // تجاهل إذا لم يسمح المتصفح بالنسخ
    }
  }

  return (
    <div
      className={`mb-2 flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
        light ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-[#25d366]/40 bg-[#25d366]/10"
      }`}
    >
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 flex-shrink-0" />
        <div>
          <p className="text-[11px] opacity-80">رمز التحقق</p>
          <p dir="ltr" className="font-mono text-xl font-bold tracking-[0.3em]">
            {code}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-black/10"
        title="نسخ الرمز"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "تم النسخ" : "نسخ"}
      </button>
    </div>
  )
}
