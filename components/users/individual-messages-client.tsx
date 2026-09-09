"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Send, RefreshCw, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getWhatsAppSettings } from "@/app/users/[userId]/settings/actions"
import { sendIndividualMessage } from "@/app/users/[userId]/individual/actions"

interface Message {
  id: string
  recipient_phone: string
  message_text: string
  media_url: string | null
  status: string
  sent_at: string | null
  created_at: string
}

interface Template {
  name: string
  language: string
  status: string
  components: any[]
}

export function IndividualMessagesClient({
  userId,
  initialMessages,
}: {
  userId: string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState(initialMessages)
  const [phone, setPhone] = useState("")
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [countryCode, setCountryCode] = useState("966")
  const [selectedMediaId, setSelectedMediaId] = useState<string>("")
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([])
  const [showMediaSelector, setShowMediaSelector] = useState(false)

  const countries = [
    { code: "966", name: "السعودية", flag: "🇸🇦" },
    { code: "971", name: "الإمارات", flag: "🇦🇪" },
    { code: "965", name: "الكويت", flag: "🇰🇼" },
    { code: "974", name: "قطر", flag: "🇶🇦" },
    { code: "973", name: "البحرين", flag: "🇧🇭" },
    { code: "968", name: "عمان", flag: "🇴🇲" },
    { code: "962", name: "الأردن", flag: "🇯🇴" },
    { code: "20", name: "مصر", flag: "🇪🇬" },
  ]

  const cleanAccessToken = (token: string) => {
    if (!token) return ""

    let cleaned = token
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, "") // إزالة Unicode spaces
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // إزالة zero-width spaces
      .replace(/\r?\n|\r/g, "") // إزالة line breaks
      .trim()

    // إذا احتوى الرمز على / أو = فهو Base64، نستبدل المسافات بـ +
    if (cleaned.includes("/") || cleaned.includes("=")) {
      cleaned = cleaned.replace(/\s+/g, "+")
    } else {
      // إذا لم يكن Base64، نزيل جميع المسافات
      cleaned = cleaned.replace(/\s+/g, "")
    }

    return cleaned
  }

  const normalizePhoneNumber = (phoneNumber: string): string => {
    // إزالة جميع الأحرف غير الرقمية
    const cleaned = phoneNumber.replace(/\D/g, "")

    if (!cleaned) return ""

    // التحقق إذا كان الرقم يبدأ برمز دولة معروف
    const hasCountryCode = countries.some(
      (country) => cleaned.startsWith(country.code) && cleaned.length > country.code.length,
    )

    // إذا كان الرقم يبدأ برمز دولة، استخدمه كما هو
    if (hasCountryCode) {
      return cleaned
    }

    // إذا كان الرقم يبدأ بصفر، احذف الصفر وأضف رمز الدولة
    if (cleaned.startsWith("0")) {
      const withoutZero = cleaned.substring(1)
      return `${countryCode}${withoutZero}`
    }

    // إذا كان الرقم بدون رمز دولة أو صفر، أضف رمز الدولة مباشرة
    return `${countryCode}${cleaned}`
  }

  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    try {
      console.log("[v0] Fetching user settings for individual messages...")

      const settings = await getWhatsAppSettings(userId)

      if (!settings || !settings.whatsapp_access_token || !settings.whatsapp_business_account_id) {
        alert("يرجى تكوين WhatsApp API في الإعدادات أولاً")
        return
      }

      const cleanedToken = cleanAccessToken(settings.whatsapp_access_token)

      console.log("[v0] Fetching templates for individual messages...")

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${settings.whatsapp_business_account_id}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${cleanedToken}`,
          },
        },
      )

      const result = await response.json()

      if (result.data) {
        setTemplates(result.data)
        alert(`✅ تم جلب ${result.data.length} قالب بنجاح`)
      } else if (result.error) {
        console.error("[v0] Error fetching templates:", result.error)
        alert(`❌ فشل جلب القوالب: ${result.error.message || "خطأ غير معروف"}`)
      } else {
        alert("❌ فشل جلب القوالب")
      }
    } catch (error) {
      console.error("[v0] Error fetching templates:", error)
      alert("❌ حدث خطأ أثناء جلب القوالب")
    } finally {
      setLoadingTemplates(false)
    }
  }

  const getTemplatePreview = () => {
    if (!selectedTemplate) return ""

    const bodyComponent = selectedTemplate.components?.find((c: any) => c.type === "BODY")
    return bodyComponent?.text || ""
  }

  const handleSend = async () => {
    if (!phone || !messageText) return

    setSending(true)
    try {
      const normalizedPhone = normalizePhoneNumber(phone)

      if (normalizedPhone.length < 10) {
        alert("❌ رقم الهاتف غير صحيح")
        setSending(false)
        return
      }

      const result = await sendIndividualMessage(
        userId,
        normalizedPhone,
        messageText,
        !!selectedTemplate,
        selectedTemplate?.name,
        selectedMediaId || undefined,
      )

      if (result.success) {
        alert("✅ تم إرسال الرسالة بنجاح")
        setPhone("")
        setMessageText("")
        setSelectedTemplate(null)
        setSelectedMediaId("")
      } else {
        alert(`❌ ${result.error}`)
      }
    } catch (error) {
      console.error("Error sending message:", error)
      alert("❌ حدث خطأ أثناء إرسال الرسالة")
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    const fetchMediaLibrary = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("media_library")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (data) setMediaLibrary(data)
    }
    fetchMediaLibrary()
  }, [userId])

  const templateHasImage = selectedTemplate?.components?.some((c: any) => c.type === "HEADER" && c.format === "IMAGE")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">الرسائل الفردية</h2>
        <p className="text-gray-600">إرسال رسائل واتساب فردية للعملاء</p>
      </div>

      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            إرسال رسالة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">القوالب المعتمدة</h3>
                <p className="text-xs text-gray-600 mt-0.5">اختر قالب رسالة معتمد من Meta</p>
              </div>
              <Button
                onClick={fetchTemplates}
                disabled={loadingTemplates}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 ml-2 ${loadingTemplates ? "animate-spin" : ""}`} />
                جلب القوالب
              </Button>
            </div>

            {templates.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => {
                      setSelectedTemplate(template)
                      setMessageText(getTemplatePreview())
                    }}
                    className={`p-3 rounded-lg border-2 text-right transition-all text-sm flex items-start justify-between ${
                      selectedTemplate?.name === template.name
                        ? "border-emerald-500 bg-emerald-100 shadow-sm"
                        : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">({template.language})</div>
                    </div>
                    {selectedTemplate?.name === template.name && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg space-y-3">
            <Label className="text-sm font-semibold block">اختيار رمز الدولة</Label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right bg-white"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name} (+{country.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">سيتم إضافة رمز الدولة تلقائياً إذا لم يكن موجوداً</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">رقم الجوال (WhatsApp)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="500000000 أو 0500000000 أو 966500000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="font-mono text-right"
              dir="ltr"
            />
            {phone && (
              <p className="text-xs text-gray-600">
                الرقم بعد التنسيق: <span className="font-mono font-semibold">{normalizePhoneNumber(phone)}</span>
              </p>
            )}
          </div>

          {selectedTemplate && templateHasImage && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">صورة القالب (مطلوبة)</h3>
                  <p className="text-xs text-gray-600 mt-0.5">اختر صورة من مكتبة الصور</p>
                </div>
                <Button
                  onClick={() => setShowMediaSelector(!showMediaSelector)}
                  size="sm"
                  variant="outline"
                  className="text-sm"
                >
                  {showMediaSelector ? "إخفاء" : "اختر صورة"}
                </Button>
              </div>

              {selectedMediaId && (
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                  <img
                    src={`/api/media-proxy?media_id=${selectedMediaId}&user_id=${userId}`}
                    alt="Selected"
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-mono text-xs text-gray-600">Media ID: {selectedMediaId}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedMediaId("")} className="text-red-500">
                    إزالة
                  </Button>
                </div>
              )}

              {showMediaSelector && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {mediaLibrary.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedMediaId(item.media_id)
                        setShowMediaSelector(false)
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedMediaId === item.media_id
                          ? "border-orange-500 ring-2 ring-orange-200"
                          : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <img
                        src={`/api/media-proxy?media_id=${item.media_id}&user_id=${userId}`}
                        alt={item.file_name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">نص الرسالة</Label>
            <Textarea
              id="message"
              placeholder={selectedTemplate ? "معاينة القالب المختار (يمكنك التعديل)" : "اكتب رسالتك هنا..."}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={5}
              className="resize-none"
            />
            {selectedTemplate && (
              <div className="flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200">
                <p className="text-xs text-gray-700">
                  تم اختيار القالب: <span className="font-semibold">{selectedTemplate.name}</span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(null)
                    setMessageText("")
                  }}
                  className="text-xs h-7"
                >
                  إلغاء القالب
                </Button>
              </div>
            )}
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !phone || !messageText || (templateHasImage && !selectedMediaId)}
            className="w-full bg-gradient-to-r from-emerald-500 to-blue-900 hover:from-emerald-600 hover:to-blue-950"
          >
            {sending ? "جاري الإرسال..." : "إرسال الرسالة"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
