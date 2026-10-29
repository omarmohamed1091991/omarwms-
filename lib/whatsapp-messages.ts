// تحليل رسائل WhatsApp الواردة من Meta (Webhook) وتحويلها لصيغة صندوق الوارد.
// الملف بدون اعتماديات خادم حتى يمكن استخدامه في الواجهة أيضاً.

export const MEDIA_MESSAGE_TYPES = ["image", "audio", "video", "document", "sticker"] as const

export interface ParsedIncomingMessage {
  messageType: string
  messageText: string
  mediaId: string | null
}

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "")

function describeUnsupported(message: any): string {
  const error = Array.isArray(message.errors) ? message.errors[0] : null
  const details = asText(error?.error_data?.details) || asText(error?.message) || asText(error?.title)
  return [
    "⚠️ رسالة غير مدعومة في WhatsApp Cloud API",
    "قد تكون رسالة قالب من نشاط تجاري (مثل رمز تحقق) أو نوع رسالة لا يعرضه Meta عبر الـ API.",
    details ? `التفاصيل: ${details}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function describeContacts(contacts: any[]): string {
  const lines = contacts.map((contact) => {
    const name = asText(contact?.name?.formatted_name) || asText(contact?.name?.first_name) || "جهة اتصال"
    const phones = (contact?.phones || []).map((p: any) => asText(p?.phone) || asText(p?.wa_id)).filter(Boolean)
    return phones.length ? `${name}: ${phones.join("، ")}` : name
  })
  return `👤 جهة اتصال\n${lines.join("\n")}`
}

export function parseIncomingWhatsAppMessage(message: any): ParsedIncomingMessage {
  const type = asText(message?.type) || "text"

  switch (type) {
    case "text":
      return { messageType: "text", messageText: asText(message.text?.body), mediaId: null }
    case "image":
    case "video":
    case "audio":
    case "document":
    case "sticker": {
      const media = message[type] || {}
      const fallback: Record<string, string> = {
        image: "📷 صورة",
        video: "🎬 فيديو",
        audio: media.voice ? "🎤 رسالة صوتية" : "🎵 ملف صوتي",
        document: "📄 مستند",
        sticker: "🏷️ ملصق",
      }
      const caption = asText(media.caption)
      const filename = asText(media.filename)
      const text =
        type === "document"
          ? [filename ? `📄 ${filename}` : fallback.document, caption].filter(Boolean).join("\n")
          : caption || fallback[type]
      return { messageType: type, messageText: text, mediaId: asText(media.id) || null }
    }
    case "location": {
      const loc = message.location || {}
      const label = [asText(loc.name), asText(loc.address)].filter(Boolean).join(" - ")
      return {
        messageType: "location",
        messageText: `📍 ${label ? `${label}\n` : "موقع: "}https://maps.google.com/?q=${loc.latitude},${loc.longitude}`,
        mediaId: null,
      }
    }
    case "contacts":
      return { messageType: "contact", messageText: describeContacts(message.contacts || []), mediaId: null }
    case "button":
      return {
        messageType: "button_reply",
        messageText: asText(message.button?.text) || asText(message.button?.payload),
        mediaId: null,
      }
    case "interactive": {
      const interactive = message.interactive || {}
      if (interactive.button_reply) {
        return { messageType: "interactive_reply", messageText: asText(interactive.button_reply.title), mediaId: null }
      }
      if (interactive.list_reply) {
        const desc = asText(interactive.list_reply.description)
        return {
          messageType: "list_reply",
          messageText: [asText(interactive.list_reply.title), desc].filter(Boolean).join("\n"),
          mediaId: null,
        }
      }
      if (interactive.nfm_reply) {
        return {
          messageType: "flow_reply",
          messageText: asText(interactive.nfm_reply.body) || asText(interactive.nfm_reply.response_json) || "📝 رد نموذج",
          mediaId: null,
        }
      }
      return { messageType: "interactive", messageText: asText(interactive.body?.text) || "رسالة تفاعلية", mediaId: null }
    }
    case "reaction":
      return {
        messageType: "reaction",
        messageText: message.reaction?.emoji ? `تفاعل ${message.reaction.emoji}` : "أزال التفاعل",
        mediaId: null,
      }
    case "order": {
      const items = message.order?.product_items?.length || 0
      return {
        messageType: "order",
        messageText: [`🛒 طلب (${items} منتج)`, asText(message.order?.text)].filter(Boolean).join("\n"),
        mediaId: null,
      }
    }
    case "system":
      return { messageType: "system", messageText: asText(message.system?.body) || "تحديث من النظام", mediaId: null }
    case "request_welcome":
      return { messageType: "request_welcome", messageText: "👋 بدأ العميل المحادثة", mediaId: null }
    case "unsupported":
    case "unknown":
      return { messageType: "unsupported", messageText: describeUnsupported(message), mediaId: null }
    default: {
      const payload = message[type] || {}
      const text = asText(payload.body) || asText(payload.text) || asText(payload.caption)
      return { messageType: type, messageText: text || `رسالة من نوع ${type}`, mediaId: asText(payload.id) || null }
    }
  }
}

const CODE_KEYWORDS =
  /(code|otp|verification|verify|confirmation|confirm|passcode|password|pin|رمز|كود|الرمز|تحقق|التحقق|تأكيد|التأكيد|كلمة المرور)/i

// يستخرج رمز التحقق (مثل رسائل Facebook / Meta / WhatsApp) من نص الرسالة إن وجد.
export function extractVerificationCode(text: string | null | undefined): string | null {
  if (!text || !CODE_KEYWORDS.test(text)) return null
  const normalized = text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
  // FB-12345 / G-123456
  const prefixed = normalized.match(/\b[A-Z]{1,3}-(\d{4,8})\b/)
  if (prefixed) return prefixed[1]
  // 123-456 أو 123 456 أو 123456
  const matches = normalized.match(/(?<![\d.,:/])\d{3}[-\s]\d{3}(?![\d,:/]|\.\d)|(?<![\d.,:/+])\d{4,8}(?![\d,:/]|\.\d)/g)
  if (!matches) return null
  return matches[0].replace(/[-\s]/g, "")
}

export function getMediaProxyUrl(mediaUrl: string, userId: string): string {
  if (mediaUrl.startsWith("http")) return mediaUrl
  return `/api/media-proxy?media_id=${encodeURIComponent(mediaUrl)}&user_id=${encodeURIComponent(userId)}`
}
