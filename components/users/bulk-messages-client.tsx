"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Upload, CheckCircle2, ImageIcon, XCircle, Loader2, RefreshCw, X, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { getWhatsAppSettings } from "@/app/users/[userId]/settings/actions"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast" // تصحيح استيراد toast من hooks/use-toast بدلاً من components/ui/toast
import { CheckCircle } from "lucide-react" // تصحيح استيراد CheckCircle

interface Template {
  name: string
  language: string
  status: string
  components: any[]
}

interface MediaFile {
  id: string
  media_id: string
  file_name: string
}

interface PhoneNumber {
  phoneNumber: string
}

const countryCodes = {
  SA: "966",
  AE: "971",
  KW: "965",
  QA: "974",
  BH: "973",
  OM: "968",
  JO: "962",
  EG: "20",
}

const countryFlags = {
  SA: "🇸🇦",
  AE: "🇦🇪",
  KW: "🇰🇼",
  QA: "🇶🇦",
  BH: "🇧🇭",
  OM: "🇴🇲",
  JO: "🇯🇴",
  EG: "🇪🇬",
}

const countryNames = {
  SA: "السعودية",
  AE: "الإمارات",
  KW: "الكويت",
  QA: "قطر",
  BH: "البحرين",
  OM: "عمان",
  JO: "الأردن",
  EG: "مصر",
}

export default function BulkMessagesClient({ userId }: { userId: string }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [selectedCountry, setSelectedCountry] = useState("SA")
  const [countryCodeDialogOpen, setCountryCodeDialogOpen] = useState(false)
  const [sendingStatus, setSendingStatus] = useState<"idle" | "sending">("idle")
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [sendResult, setSendResult] = useState<{ delivered: number; failed: number } | null>(null)
  const [sentMessages, setSentMessages] = useState<any[]>([])
  const [sendingProgress, setSendingProgress] = useState(0)
  const [sendingCurrent, setSendingCurrent] = useState(0)
  const [sendingTotal, setSendingTotal] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [whatsappSettings, setWhatsAppSettings] = useState<any | null>(null)
  const [templateParameters, setTemplateParameters] = useState<any[]>([])
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null)
  const [selectedWhatsAppMediaId, setSelectedWhatsAppMediaId] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<"url" | "media_id">("media_id")
  const [mediaUrl, setMediaUrl] = useState<string>("")
  const [sentCount, setSentCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [deliveredCount, setDeliveredCount] = useState(0)
  const [templatePausedError, setTemplatePausedError] = useState<string | null>(null)

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

  const fetchTemplates = async () => {
    try {
      console.log("[v0] Fetching user settings with Server Action...")

      const settings = await getWhatsAppSettings(userId)

      if (!settings || !settings.whatsapp_access_token || !settings.whatsapp_business_account_id) {
        alert("يرجى تكوين WhatsApp API في الإعدادات أولاً")
        return
      }

      const cleanedToken = cleanAccessToken(settings.whatsapp_access_token)

      console.log("[v0] Fetching templates from WhatsApp API...")
      console.log("[v0] Business Account ID:", settings.whatsapp_business_account_id)
      console.log("[v0] Token length:", cleanedToken.length)

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${settings.whatsapp_business_account_id}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${cleanedToken}`,
          },
        },
      )

      const result = await response.json()

      console.log("[v0] Templates API response:", result)

      if (result.data) {
        setTemplates(result.data)
        alert(`✅ تم جلب ${result.data.length} قالب بنجاح`)
      } else if (result.error) {
        console.error("[v0] WhatsApp API error:", result.error)
        alert(`❌ فشل جلب القوالب: ${result.error.message || "خطأ غير معروف"}`)
      } else {
        alert("❌ فشل جلب القوالب - لا توجد بيانات")
      }
    } catch (error) {
      console.error("[v0] Error in fetchTemplates:", error)
      alert("❌ حدث خطأ أثناء جلب القوالب")
    }
  }

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

        // استخراج الأرقام من الملف
        const numbers = jsonData
          .flat()
          .filter((cell: any) => cell && String(cell).match(/^\d+$/))
          .map((num: string) => ({ phoneNumber: num }))

        setPhoneNumbers(numbers)
      } catch (error) {
        console.error("Error parsing Excel:", error)
        alert("فشل قراءة ملف Excel")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const validNumbers = useMemo(() => {
    const lines = phoneNumbers.map((num) => num.phoneNumber.trim()).filter((num) => num.length > 0)
    const invalid: string[] = []

    const valid = lines
      .map((num) => {
        const cleaned = num.replace(/\D/g, "")
        if (!cleaned || cleaned.length < 9) {
          invalid.push(num)
          return null
        }

        const hasCountryCode = Object.values(countryCodes).some(
          (code) => cleaned.startsWith(code) && cleaned.length > code.length,
        )

        if (hasCountryCode) {
          return cleaned
        }

        if (cleaned.startsWith("0")) {
          const withoutZero = cleaned.substring(1)
          return `${countryCodes[selectedCountry]}${withoutZero}`
        }

        return `${countryCodes[selectedCountry]}${cleaned}`
      })
      .filter((num): num is string => num !== null && num.length >= 10 && num.length <= 15)

    return { valid, invalid }
  }, [phoneNumbers, selectedCountry])

  useEffect(() => {
    const fetchWhatsAppSettings = async () => {
      const settings = await getWhatsAppSettings(userId)
      console.log("[v0] WhatsApp Settings loaded:", {
        hasSettings: !!settings,
        hasAccessToken: !!settings?.whatsapp_access_token,
        hasPhoneNumberId: !!settings?.phone_number_id,
        fullSettings: settings,
      })
      setWhatsAppSettings(settings)
    }

    fetchWhatsAppSettings()
  }, [userId])

  const fetchMediaLibrary = async () => {
    if (loadingMedia) return

    setLoadingMedia(true)
    try {
      console.log("[v0] Fetching media library for userId:", userId)
      const { getMediaLibraryWithUrls } = await import("@/app/users/[userId]/media/actions")
      const result = await getMediaLibraryWithUrls(userId)

      console.log("[v0] Media library result:", result)

      if (result.success) {
        setMediaLibrary(result.media)
        console.log("[v0] Media library loaded:", result.media.length, "items")
      } else {
        console.error("[v0] Error loading media library:", result.error)
      }
    } catch (error) {
      console.error("[v0] Error fetching media library:", error)
    } finally {
      setLoadingMedia(false)
    }
  }

  const handleSendBulkMessages = async () => {
    if (!selectedTemplate) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار قالب رسالة",
        variant: "destructive",
      })
      return
    }

    if (phoneNumbers.length === 0) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال أرقام هواتف",
        variant: "destructive",
      })
      return
    }

    const numbers = phoneNumbers.map((p) => p.phoneNumber)

    try {
      setSendingStatus("sending")
      setSentMessages([])
      setSendingProgress(0)
      setSendingCurrent(0)
      setSendingTotal(numbers.length)
      setSentCount(0)
      setFailedCount(0)
      setDeliveredCount(0)
      setTemplatePausedError(null)

      const cleanedToken = whatsappSettings.whatsapp_access_token
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\r?\n|\r/g, "")
        .trim()

      // حساب المدة المتوقعة: 150ms لكل رسالة + 1000ms لكل batch من 10
      const estimatedTime = Math.max(
        600000, // 10 دقائق كحد أدنى
        numbers.length * 200 + Math.ceil(numbers.length / 10) * 1500,
      )

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), estimatedTime)

      const response = await fetch("/api/bulk-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          phoneNumbers: numbers,
          templateName: selectedTemplate.name,
          templateData: selectedTemplate,
          parameters: templateParameters,
          mediaId: selectedWhatsAppMediaId || undefined,
          accessToken: cleanedToken,
          phoneNumberId: whatsappSettings.whatsapp_phone_number_id,
          countryCode: countryCodes[selectedCountry as keyof typeof countryCodes],
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("فشل في الاتصال بخادم الإرسال")
      }

      let buffer = ""
      let lastProgressTime = Date.now()
      let lastKnownDelivered = 0
      let lastKnownFailed = 0
      let lastKnownCurrent = 0
      let receivedComplete = false

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          if (!receivedComplete && lastKnownCurrent > 0) {
            setSendResult({ delivered: lastKnownDelivered, failed: lastKnownFailed })
            setShowResultDialog(true)
            setPhoneNumbers([])
            toast({
              title: "تم الإرسال",
              description: `تم تسليم ${lastKnownDelivered} رسالة لـ Meta${lastKnownFailed > 0 ? ` وفشل ${lastKnownFailed}` : ""}`,
            })
          }
          break
        }

        lastProgressTime = Date.now()
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith(":")) continue

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === "progress") {
                setSendingCurrent(data.current)
                setSendingTotal(data.total)
                setSendingProgress(data.percentage)
                setDeliveredCount(data.delivered || data.sent || 0)
                setFailedCount(data.failed)
                lastKnownDelivered = data.delivered || data.sent || 0
                lastKnownFailed = data.failed
                lastKnownCurrent = data.current
              } else if (data.type === "complete") {
                receivedComplete = true
                setSendResult({ delivered: data.delivered || data.sent || 0, failed: data.failed })
                setShowResultDialog(true)
                setPhoneNumbers([])
                toast({
                  title: "تم الإرسال بنجاح",
                  description: `تم تسليم ${data.delivered || data.sent || 0} رسالة لـ Meta${data.failed > 0 ? ` وفشل ${data.failed}` : ""}`,
                  duration: 10000,
                })
              } else if (data.type === "template_paused") {
                receivedComplete = true
                setSendResult({ delivered: data.delivered || data.sent || 0, failed: data.failed })
                setTemplatePausedError(
                  data.errorMessage ||
                    `القالب "${selectedTemplate?.name}" تم إيقافه مؤقتاً من Meta بسبب جودة منخفضة. يرجى الذهاب إلى Meta Business Suite واختيار قالب آخر أو إصلاح هذا القالب.`,
                )
                setShowResultDialog(true)
                setPhoneNumbers([])
                toast({
                  title: "تم إيقاف القالب",
                  description: "القالب متوقف مؤقتاً من Meta بسبب جودة منخفضة",
                  variant: "destructive",
                  duration: 10000,
                })
              } else if (data.type === "error") {
                receivedComplete = true
                toast({
                  title: "خطأ في الإرسال",
                  description: data.message || "حدث خطأ أثناء الإرسال",
                  variant: "destructive",
                })
              }
            } catch (e) {
              // تجاهل أخطاء التحليل
            }
          }
        }

        if (Date.now() - lastProgressTime > 180000) {
          // إذا انقطع الاتصال، نعرض النتيجة بناءً على آخر حالة
          if (lastKnownCurrent > 0) {
            setSendResult({ delivered: lastKnownDelivered, failed: lastKnownFailed })
            setShowResultDialog(true)
            setPhoneNumbers([])
            toast({
              title: "انتهت مهلة الاتصال",
              description: `تم إرسال ${lastKnownDelivered} رسالة قبل انقطاع الاتصال`,
              variant: "destructive",
            })
          }
          throw new Error("انتهت مهلة الاتصال. تم إرسال بعض الرسائل، يرجى التحقق من الإحصائيات.")
        }
      }
    } catch (error: any) {
      console.error("[v0] Error in handleSendBulkMessages:", error)

      let errorMessage = "حدث خطأ أثناء إرسال الرسائل"
      if (error.name === "AbortError") {
        errorMessage = "تم إلغاء العملية بسبب انتهاء المهلة. يرجى تقليل عدد الأرقام أو المحاولة لاحقاً."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      })
    } finally {
      setSendingStatus("idle")
    }
  }

  const getTemplatePreview = () => {
    if (!selectedTemplate) return null

    const bodyComponent = selectedTemplate.components?.find((c: any) => c.type === "BODY")

    return bodyComponent?.text || "لا توجد معاينة متاحة"
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">إرسال رسائل جماعية</h1>
        <p className="text-sm sm:text-base text-gray-600">أدخل الأرقام أو ارفع ملف Excel واختر قالب الرسالة</p>
      </div>

      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100 pb-4">
          <CardTitle className="text-base sm:text-lg">تفاصيل الرسائل الجماعية</CardTitle>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">أدخل الأرقام أو ارفع ملف Excel واختر قالب الرسالة</p>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-xl border-2 border-emerald-300 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  القوالب المعتمدة
                </h3>
                <p className="text-xs text-gray-600 mt-1">اختر قالب الرسالة من القائمة أدناه</p>
              </div>
              <button
                onClick={fetchTemplates}
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white text-xs px-4 py-2 rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                جلب القوالب
              </button>
            </div>

            {templates.length > 0 && (
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                  className="w-full justify-between bg-white hover:bg-emerald-50 border-2 border-emerald-300 text-gray-900 font-semibold shadow-sm hover:shadow-md transition-all"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    {selectedTemplate ? selectedTemplate.name : "اختر قالب الرسالة"}
                  </span>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>

                {showTemplateDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-emerald-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {templates.map((template) => (
                      <button
                        key={template.name}
                        onClick={() => {
                          setSelectedTemplate(template)
                          setShowTemplateDropdown(false) // إغلاق القائمة بعد الاختيار
                        }}
                        className={`w-full p-3 text-right hover:bg-emerald-50 transition-colors border-b last:border-b-0 ${
                          selectedTemplate?.name === template.name ? "bg-emerald-100 border-l-4 border-l-emerald-500" : ""
                        }`}
                      >
                        <div className="font-semibold text-gray-900 text-sm">{template.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">({template.language})</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {(selectedTemplate?.components?.some((c: any) => c.type === "HEADER" && c.format === "IMAGE") ||
            selectedTemplate?.components?.some((c: any) => c.type === "HEADER" && c.format === "VIDEO") ||
            selectedTemplate?.components?.some((c: any) => c.type === "HEADER" && c.format === "DOCUMENT")) && (
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-2xl border-2 border-teal-200 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-6 h-6 text-teal-600" />
                <h3 className="text-lg font-bold text-teal-900">إضافة وسائط (اختياري)</h3>
              </div>

              <div className="mb-4">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">اختر طريقة الإضافة:</Label>
                <RadioGroup
                  value={mediaType}
                  onValueChange={(v: "url" | "media_id") => {
                    setMediaType(v)
                    if (v === "url") {
                      setSelectedMedia(null)
                      setSelectedWhatsAppMediaId(null)
                    } else {
                      setMediaUrl("")
                    }
                  }}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="url" id="url-radio" />
                      <Label htmlFor="url-radio" className="cursor-pointer">
                        رابط URL
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="media_id" id="media-id-radio" />
                      <Label htmlFor="media-id-radio" className="cursor-pointer">
                        Media ID (من مكتبة الصور)
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {mediaType === "url" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">أدخل رابط الصورة:</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="text-right"
                  />
                  {mediaUrl && (
                    <div className="mt-2 p-2 bg-white rounded-lg border-2 border-teal-300">
                      <img
                        src={mediaUrl || "/placeholder.svg"}
                        alt="معاينة"
                        className="w-full h-32 object-contain rounded"
                        onError={(e) => {
                          e.currentTarget.src = "/abstract-colorful-swirls.png"
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {mediaType === "media_id" && (
                <div className="space-y-3">
                  {selectedMedia && (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border-2 border-teal-300">
                      <div className="w-16 h-16 relative rounded-lg overflow-hidden border border-teal-200">
                        <img
                          src={`/api/media-proxy?media_id=${selectedMedia.media_id}&user_id=${userId}`}
                          alt={selectedMedia.file_name || "صورة"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{selectedMedia.file_name}</p>
                        <p className="text-xs text-gray-500">Media ID: {selectedMedia.media_id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMedia(null)
                          setSelectedWhatsAppMediaId(null)
                        }}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowMediaLibrary(!showMediaLibrary)
                      if (!showMediaLibrary) fetchMediaLibrary()
                    }}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 shadow-md hover:shadow-lg transition-all"
                  >
                    <ImageIcon className="w-4 h-4 ml-2" />
                    {showMediaLibrary ? "إخفاء المكتبة" : "اختر صورة من مكتبة الصور"}
                  </Button>

                  {showMediaLibrary && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-4 bg-white rounded-lg border-2 border-teal-200 max-h-64 overflow-y-auto">
                      {loadingMedia ? (
                        <div className="col-span-full flex justify-center items-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
                        </div>
                      ) : mediaLibrary.length === 0 ? (
                        <p className="col-span-full text-center text-gray-500 text-sm py-4">لا توجد صور في المكتبة</p>
                      ) : (
                        mediaLibrary.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              console.log("[v0] Media selected from library:", item)
                              setSelectedMedia(item)
                              setSelectedWhatsAppMediaId(item.media_id)
                              setShowMediaLibrary(false)
                            }}
                            className={`aspect-square rounded-lg border-2 p-1 hover:border-teal-500 transition-all relative overflow-hidden ${
                              selectedMedia?.id === item.id
                                ? "border-teal-500 bg-teal-50 ring-2 ring-teal-300"
                                : "border-gray-200"
                            }`}
                          >
                            <img
                              src={`/api/media-proxy?media_id=${item.media_id}&user_id=${userId}`}
                              alt={item.file_name || "صورة"}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                                const parent = e.currentTarget.parentElement
                                if (parent && !parent.querySelector(".fallback-icon")) {
                                  const fallback = document.createElement("div")
                                  fallback.className =
                                    "fallback-icon w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-cyan-100 rounded"
                                  fallback.innerHTML = `<svg class="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`
                                  parent.appendChild(fallback)
                                }
                              }}
                            />
                            {selectedMedia?.id === item.id && (
                              <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-teal-600 font-bold" />
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedTemplate && (
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 p-4 sm:p-5 rounded-lg text-white shadow-md">
              <h3 className="text-base sm:text-lg font-bold mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                معاينة الرسالة
              </h3>
              <div className="bg-white/10 backdrop-blur-sm p-3 sm:p-4 rounded-lg text-right">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-sm sm:text-base">{getTemplatePreview()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-6 rounded-lg space-4">
            <h3 className="font-semibold text-gray-900">اختيار رمز الدولة</h3>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full p-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right bg-white font-semibold shadow-sm hover:shadow-md transition-all"
            >
              {Object.entries(countryCodes).map(([code, name]) => (
                <option key={code} value={code}>
                  {countryFlags[code]} {countryNames[code]} (+{name})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 bg-white/70 p-2 rounded-md">
              💡 سيتم إضافة رمز الدولة تلقائياً لجميع الأرقام المدخلة
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center justify-between">
              <span>أرقام الجوال</span>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  {validNumbers.valid.length} صحيح
                </Badge>
                {validNumbers.invalid.length > 0 && (
                  <Badge variant="secondary" className="bg-red-50 text-red-700">
                    {validNumbers.invalid.length} خاطئ
                  </Badge>
                )}
              </div>
            </Label>

            <Tabs value="paste" onValueChange={() => {}}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste">إدخال يدوي</TabsTrigger>
                <TabsTrigger value="excel">رفع Excel</TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-gray-700 space-y-1">
                  <p className="font-semibold">تنسيق الأرقام:</p>
                  <ul className="list-disc mr-4 space-y-0.5">
                    <li>رقم واحد في كل سطر</li>
                    <li>مثال: 500000000 أو 0500000000</li>
                  </ul>
                </div>

                {sendingStatus === "sending" && (
                  <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-emerald-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                          <span className="font-bold text-lg text-purple-800">جاري الإرسال...</span>
                        </div>
                        <div className="text-left">
                          <span className="text-3xl font-bold text-purple-600">{sendingCurrent}</span>
                          <span className="text-gray-500 mx-1">/</span>
                          <span className="text-xl font-semibold text-gray-600">{sendingTotal}</span>
                        </div>
                      </div>

                      <Progress value={sendingProgress} className="h-4 mb-3" />

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-4">
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            ناجح: <strong>{sentCount}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            فاشل: <strong>{failedCount}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600 font-bold text-lg">{sendingProgress}%</span>
                          <span className="text-gray-500">المتبقي: {sendingTotal - sendingCurrent} رسالة</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden focus-within:border-emerald-500 transition-colors">
                  <Textarea
                    placeholder="أدخل الأرقام هنا... (كل رقم في سطر منفصل)&#10;مثال:&#10;500000000&#10;501234567&#10;502345678"
                    value={phoneNumbers.map((p) => p.phoneNumber).join("\n")}
                    onChange={(e) =>
                      setPhoneNumbers(
                        e.target.value
                          .split("\n")
                          .map((num) => ({ phoneNumber: num }))
                          .filter((p) => p.phoneNumber.trim().length > 0),
                      )
                    }
                    rows={8}
                    className="font-mono text-right resize-none border-0 focus-visible:ring-0 max-h-[240px] overflow-y-auto"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between text-sm bg-green-50 p-3 rounded-lg border-2 border-green-200">
                    <span className="text-gray-700 font-semibold">صحيحة:</span>
                    <span className="font-black text-green-600 text-2xl">{validNumbers.valid.length}</span>
                  </div>
                  {validNumbers.invalid.length > 0 && (
                    <div className="flex items-center justify-between text-sm bg-red-50 p-3 rounded-lg border-2 border-red-300">
                      <span className="text-gray-700 font-semibold">خاطئة:</span>
                      <span className="font-black text-red-600 text-2xl">{validNumbers.invalid.length}</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="excel" className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto"
                >
                  <Upload className="w-4 h-4 ml-2" />
                  اختر ملف Excel
                </Button>
                <p className="text-sm text-gray-500 mt-2">يدعم: .xlsx, .xls, .csv</p>
                <p className="text-xs text-gray-400 mt-1">الحد الأقصى: 100,000 رقم</p>
                {validNumbers.valid.length > 0 && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">الرسائل المرسلة بنجاح</p>
                    <p className="text-4xl font-black text-green-600">{validNumbers.valid.length}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <Button
            size="lg"
            onClick={handleSendBulkMessages}
            disabled={
              sendingStatus === "sending" ||
              validNumbers.valid.length === 0 ||
              !selectedTemplate ||
              !whatsappSettings?.whatsapp_access_token ||
              !whatsappSettings?.whatsapp_phone_number_id
            }
            className="w-full bg-gradient-to-r from-emerald-500 via-purple-500 to-indigo-500 hover:from-emerald-600 hover:via-purple-600 hover:to-indigo-500 text-white text-base font-bold py-6 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {sendingStatus === "sending" ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                جاري الإرسال... ({sendingCurrent}/{sendingTotal})
              </>
            ) : (
              <>
                <Send className="mr-2 h-5" />
                إرسال إلى {validNumbers.valid.length} رقم
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {console.log("[v0] Dialog state:", { showResultDialog, sendResult })}

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">
              {templatePausedError ? "تم إيقاف القالب" : "نتيجة الإرسال"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            {templatePausedError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <p className="font-semibold mb-1">القالب متوقف من Meta</p>
                    <p>{templatePausedError}</p>
                    <p className="mt-2 text-xs">
                      يرجى الذهاب إلى Meta Business Suite لإصلاح القالب أو استخدام قالب آخر.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">{sendResult?.delivered || 0}</div>
                <div className="text-sm text-muted-foreground">تم التسليم لـ Meta</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-green-50 dark:from-red-900/20 dark:to-green-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-600">{sendResult?.failed || 0}</div>
                <div className="text-sm text-muted-foreground">فشل التسليم</div>
              </div>
            </div>
            {!templatePausedError && (
              <p className="text-xs text-center text-muted-foreground mt-4">
                ملاحظة: التسليم لـ Meta لا يعني التسليم الفعلي للمستلم
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowResultDialog(false)
                setTemplatePausedError(null)
              }}
              className="w-full"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
