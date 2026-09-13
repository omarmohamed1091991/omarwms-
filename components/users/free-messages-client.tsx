"use client"

import type React from "react"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Send,
  CheckCircle2,
  XCircle,
  ImageIcon,
  X,
  Loader2,
  FileSpreadsheet,
  Keyboard,
  ChevronDown,
  RefreshCw,
  FileText,
} from "lucide-react"
import * as XLSX from "xlsx"
import { getWhatsAppSettings } from "@/app/users/[userId]/settings/actions"
import { getMediaLibraryWithUrls } from "@/app/users/[userId]/media/actions"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface MediaFile {
  id: string
  user_id: string
  media_id: string
  media_url: string | null
  media_type: string
  file_name: string
  file_size: number
  mime_type: string
  uploaded_at: string
  created_at: string
}

interface Template {
  name: string
  language: string
  status: string
  components: any[]
}

const countryCodes: Record<string, string> = {
  SA: "966",
  AE: "971",
  KW: "965",
  QA: "974",
  BH: "973",
  OM: "968",
  JO: "962",
  EG: "20",
}

const countryFlags: Record<string, string> = {
  SA: "🇸🇦",
  AE: "🇦🇪",
  KW: "🇰🇼",
  QA: "🇶🇦",
  BH: "🇧🇭",
  OM: "🇴🇲",
  JO: "🇯🇴",
  EG: "🇪🇬",
}

const countryNames: Record<string, string> = {
  SA: "السعودية",
  AE: "الإمارات",
  KW: "الكويت",
  QA: "قطر",
  BH: "البحرين",
  OM: "عمان",
  JO: "الأردن",
  EG: "مصر",
}

export default function FreeMessagesClient({ userId }: { userId: string }) {
  const [messageText, setMessageText] = useState("")
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const [phoneNumbers, setPhoneNumbers] = useState("")
  const [selectedCountry, setSelectedCountry] = useState("SA")
  const [countryCodeDialogOpen, setCountryCodeDialogOpen] = useState(false)
  const [sendingStatus, setSendingStatus] = useState<"idle" | "sending">("idle")
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null)
  const [sendingProgress, setSendingProgress] = useState(0)
  const [sendingCurrent, setSendingCurrent] = useState(0)
  const [sendingTotal, setSendingTotal] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mediaLibrary, setMediaLibrary] = useState<MediaFile[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [whatsappSettings, setWhatsAppSettings] = useState<any | null>(null)
  const [mediaType, setMediaType] = useState<"url" | "media_id">("media_id")
  const [mediaUrl, setMediaUrl] = useState<string>("")
  const [sentCount, setSentCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [inputMethod, setInputMethod] = useState<"manual" | "excel">("manual")

  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [useTemplate, setUseTemplate] = useState(false)

  const { toast } = useToast()

  const cleanAccessToken = (token: string) => {
    if (!token) return ""
    let cleaned = token
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\r?\n|\r/g, "")
      .trim()
    if (cleaned.includes("/") || cleaned.includes("=")) {
      cleaned = cleaned.replace(/\s+/g, "+")
    } else {
      cleaned = cleaned.replace(/\s+/g, "")
    }
    return cleaned
  }

  useEffect(() => {
    const fetchMediaLibrary = async () => {
      setLoadingMedia(true)
      try {
        const result = await getMediaLibraryWithUrls(userId)
        if (result.success && result.media) {
          setMediaLibrary(result.media as MediaFile[])
        }
      } catch (error) {
        console.error("Error fetching media library:", error)
      } finally {
        setLoadingMedia(false)
      }
    }
    fetchMediaLibrary()
  }, [userId])

  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const settings = await getWhatsAppSettings(userId)

      if (!settings || !settings.whatsapp_access_token || !settings.whatsapp_business_account_id) {
        toast({
          title: "خطأ",
          description: "يرجى تكوين WhatsApp API في الإعدادات أولاً",
          variant: "destructive",
        })
        return
      }

      const cleanedToken = cleanAccessToken(settings.whatsapp_access_token)

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
        toast({
          title: "تم بنجاح",
          description: `تم جلب ${result.data.length} قالب`,
        })
      } else if (result.error) {
        toast({
          title: "خطأ",
          description: result.error.message || "فشل جلب القوالب",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب القوالب",
        variant: "destructive",
      })
    } finally {
      setLoadingTemplates(false)
    }
  }

  const getTemplatePreview = (template: Template) => {
    const bodyComponent = template.components?.find((c: any) => c.type === "BODY")
    return bodyComponent?.text || ""
  }

  const templateHasImage = selectedTemplate?.components?.some((c: any) => c.type === "HEADER" && c.format === "IMAGE")

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

        const numbers = jsonData
          .flat()
          .filter((cell: any) => cell && String(cell).match(/^\d+$/))
          .join("\n")

        setPhoneNumbers(numbers)
        toast({
          title: "تم التحميل",
          description: `تم استخراج الأرقام من ملف Excel بنجاح`,
        })
      } catch (error) {
        console.error("Error parsing Excel:", error)
        toast({
          title: "خطأ",
          description: "فشل قراءة ملف Excel",
          variant: "destructive",
        })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const validNumbers = useMemo(() => {
    const lines = phoneNumbers
      .split("\n")
      .map((num) => num.trim())
      .filter((num) => num.length > 0)
    const invalid: string[] = []

    const valid = lines
      .map((num) => {
        const cleanNum = num.replace(/[^\d]/g, "")
        if (cleanNum.length >= 9 && cleanNum.length <= 15) {
          return cleanNum
        }
        invalid.push(num)
        return null
      })
      .filter(Boolean) as string[]

    return { valid, invalid, total: lines.length }
  }, [phoneNumbers])

  const handleSendFreeMessages = async () => {
    if (useTemplate && !selectedTemplate) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار قالب للإرسال",
        variant: "destructive",
      })
      return
    }

    if (!useTemplate && !messageText.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى كتابة نص الرسالة",
        variant: "destructive",
      })
      return
    }

    if (validNumbers.valid.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال أرقام صحيحة",
        variant: "destructive",
      })
      return
    }

    // التحقق من الصورة إذا كان القالب يتطلبها
    if (useTemplate && templateHasImage && !selectedMedia?.media_id) {
      toast({
        title: "خطأ",
        description: "القالب المختار يتطلب صورة، يرجى اختيار صورة من المكتبة",
        variant: "destructive",
      })
      return
    }

    const settings = await getWhatsAppSettings(userId)

    if (!settings || !settings.whatsapp_access_token || !settings.whatsapp_phone_number_id) {
      toast({
        title: "خطأ",
        description: "يرجى تكوين إعدادات WhatsApp أولاً",
        variant: "destructive",
      })
      return
    }

    setWhatsAppSettings(settings)

    const countryCode = countryCodes[selectedCountry]
    const knownCountryCodes = Object.values(countryCodes)

    const formattedNumbers = validNumbers.valid.map((num) => {
      let cleanNum = num.replace(/[^\d]/g, "")
      const hasKnownCountryCode = knownCountryCodes.some((code) => cleanNum.startsWith(code))
      if (hasKnownCountryCode) {
        return cleanNum
      }
      if (cleanNum.startsWith("0")) {
        cleanNum = cleanNum.substring(1)
      }
      return `${countryCode}${cleanNum}`
    })

    setSendingStatus("sending")
    setSendingProgress(0)
    setSendingCurrent(0)
    setSendingTotal(formattedNumbers.length)
    setSentCount(0)
    setFailedCount(0)

    try {
      const cleanedToken = cleanAccessToken(settings.whatsapp_access_token)
      const finalMediaId = selectedMedia?.media_id || null
      const finalMediaUrl = mediaType === "url" && mediaUrl.trim() ? mediaUrl.trim() : null

      const requestBody = {
        userId,
        phoneNumbers: formattedNumbers,
        messageText: useTemplate ? getTemplatePreview(selectedTemplate!) : messageText.trim(),
        mediaId: finalMediaId,
        mediaUrl: finalMediaUrl,
        accessToken: cleanedToken,
        phoneNumberId: settings.whatsapp_phone_number_id,
        // معلومات القالب
        useTemplate,
        templateName: selectedTemplate?.name,
        templateLanguage: selectedTemplate?.language || "ar",
      }

      const response = await fetch("/api/free-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error("فشل الاتصال بخادم الإرسال")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split("\n").filter((line) => line.startsWith("data: "))

          for (const line of lines) {
            try {
              const data = JSON.parse(line.replace("data: ", ""))

              if (data.type === "progress") {
                setSendingProgress(data.percentage)
                setSendingCurrent(data.current)
                setSentCount(data.sent)
                setFailedCount(data.failed)
              } else if (data.type === "complete") {
                setSendResult({ sent: data.sent, failed: data.failed })
                setShowResultDialog(true)
                setSendingStatus("idle")
                setPhoneNumbers("")
              } else if (data.type === "error") {
                toast({
                  title: "خطأ",
                  description: data.message,
                  variant: "destructive",
                })
                setSendingStatus("idle")
              }
            } catch (e) {
              console.error("Error parsing SSE:", e)
            }
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء الإرسال",
        variant: "destructive",
      })
      setSendingStatus("idle")
    }
  }

  const handleMediaSelect = (media: MediaFile) => {
    setSelectedMedia(media)
    setMediaType("media_id")
    setShowMediaLibrary(false)
  }

  const handleRemoveMedia = () => {
    setSelectedMedia(null)
    setMediaUrl("")
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4 justify-end">
            <h2 className="text-xl font-bold text-indigo-800">نوع الرسالة</h2>
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>

          <RadioGroup
            value={useTemplate ? "template" : "free"}
            onValueChange={(value) => {
              setUseTemplate(value === "template")
              if (value === "free") {
                setSelectedTemplate(null)
              }
            }}
            className="flex gap-4 justify-end"
          >
            <div
              className="flex items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors flex-1"
              onClick={() => setUseTemplate(true)}
            >
              <div className="text-right flex-1">
                <Label className="font-bold text-indigo-700 cursor-pointer">رسالة بقالب (موصى به)</Label>
                <p className="text-xs text-gray-500 mt-1">تصل لجميع العملاء - معتمدة من Meta</p>
              </div>
              <RadioGroupItem value="template" id="template" />
            </div>
            <div
              className="flex items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-amber-50 transition-colors flex-1"
              onClick={() => setUseTemplate(false)}
            >
              <div className="text-right flex-1">
                <Label className="font-bold text-amber-700 cursor-pointer">رسالة حرة</Label>
                <p className="text-xs text-gray-500 mt-1">تصل فقط للعملاء النشطين (24 ساعة)</p>
              </div>
              <RadioGroupItem value="free" id="free" />
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {useTemplate && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={fetchTemplates}
                disabled={loadingTemplates}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 ml-2 ${loadingTemplates ? "animate-spin" : ""}`} />
                جلب القوالب
              </Button>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-emerald-800">القوالب المعتمدة</h2>
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
            </div>

            {templates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-lg border-2 text-right transition-all ${
                      selectedTemplate?.name === template.name
                        ? "border-emerald-500 bg-emerald-100 shadow-md"
                        : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">{template.name}</div>
                        <div className="text-xs text-gray-500 mt-1">({template.language})</div>
                        <div className="text-xs text-gray-600 mt-2 line-clamp-2">{getTemplatePreview(template)}</div>
                      </div>
                      {selectedTemplate?.name === template.name && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>اضغط على "جلب القوالب" لعرض القوالب المتاحة</p>
              </div>
            )}

            {selectedTemplate && (
              <div className="mt-4 p-4 bg-emerald-100 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplate(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4 ml-1" />
                    إلغاء
                  </Button>
                  <p className="text-sm text-emerald-800">
                    القالب المختار: <span className="font-bold">{selectedTemplate.name}</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {useTemplate && selectedTemplate && templateHasImage && (
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 justify-end">
              <h2 className="text-xl font-bold text-orange-800">صورة القالب (مطلوبة)</h2>
              <ImageIcon className="h-5 w-5 text-orange-600" />
            </div>

            {selectedMedia ? (
              <div className="flex items-center gap-3 p-3 bg-orange-100 rounded-lg justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveMedia}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-orange-800 font-medium">{selectedMedia.file_name}</span>
                  <ImageIcon className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowMediaLibrary(true)} className="w-full bg-orange-500 hover:bg-orange-600">
                <ImageIcon className="h-4 w-4 ml-2" />
                اختر صورة من مكتبة الصور
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* نص الرسالة - يظهر فقط للرسائل الحرة */}
      {!useTemplate && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 justify-end">
              <h2 className="text-xl font-bold text-purple-800">نص الرسالة</h2>
              <Send className="h-5 w-5 text-purple-600" />
            </div>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="اكتب نص الرسالة هنا..."
              className="min-h-[150px] text-right resize-none border-purple-200 focus:border-purple-400"
              dir="rtl"
            />
            <p className="text-sm text-gray-500 mt-2 text-right">عدد الأحرف: {messageText.length}</p>
          </CardContent>
        </Card>
      )}

      {/* إضافة صورة (اختياري) - للرسائل الحرة فقط */}
      {!useTemplate && (
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 justify-end">
              <h2 className="text-xl font-bold text-teal-800">إضافة صورة (اختياري)</h2>
              <ImageIcon className="h-5 w-5 text-teal-600" />
            </div>

            <div className="space-y-4">
              <div className="text-right">
                <Label className="text-gray-700">اختر طريقة الإضافة:</Label>
                <RadioGroup
                  value={mediaType}
                  onValueChange={(value: "url" | "media_id") => {
                    setMediaType(value)
                    if (value === "url") {
                      setSelectedMedia(null)
                    } else {
                      setMediaUrl("")
                    }
                  }}
                  className="flex gap-4 justify-end mt-2"
                >
                  <div className="flex items-center gap-2">
                    <Label htmlFor="media_id">Media ID (من مكتبة الصور)</Label>
                    <RadioGroupItem value="media_id" id="media_id" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="url">رابط URL</Label>
                    <RadioGroupItem value="url" id="url" />
                  </div>
                </RadioGroup>
              </div>

              {mediaType === "media_id" ? (
                <div>
                  {selectedMedia ? (
                    <div className="flex items-center gap-2 p-3 bg-teal-100 rounded-lg justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveMedia}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-teal-800 font-medium">{selectedMedia.file_name}</span>
                        <ImageIcon className="h-5 w-5 text-teal-600" />
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => setShowMediaLibrary(true)} className="w-full bg-teal-500 hover:bg-teal-600">
                      <ImageIcon className="h-4 w-4 ml-2" />
                      اختر صورة من مكتبة الصور
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="text-left"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500 text-right">أدخل رابط مباشر للصورة</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* اختيار رمز الدولة */}
      <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4 justify-end">
            <h2 className="text-xl font-bold text-emerald-800">اختيار رمز الدولة</h2>
          </div>

          <button
            onClick={() => setCountryCodeDialogOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3 border-2 border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <ChevronDown className="h-5 w-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {countryFlags[selectedCountry]} {countryNames[selectedCountry]} (+{countryCodes[selectedCountry]})
              </span>
            </div>
          </button>

          <p className="text-sm text-emerald-600 mt-2 text-right">
            سيتم إضافة رمز الدولة تلقائياً لجميع الأرقام المدخلة
          </p>
        </CardContent>
      </Card>

      {/* أرقام الجوال */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <span className="text-green-600 text-sm font-medium">{validNumbers.valid.length} صحيح</span>
              {validNumbers.invalid.length > 0 && (
                <span className="text-red-500 text-sm">{validNumbers.invalid.length} خاطئ</span>
              )}
            </div>
            <h2 className="text-xl font-bold text-blue-800">أرقام الجوال</h2>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              variant={inputMethod === "excel" ? "default" : "outline"}
              className={`flex-1 ${inputMethod === "excel" ? "bg-blue-500" : "bg-transparent"}`}
              onClick={() => {
                setInputMethod("excel")
                fileInputRef.current?.click()
              }}
            >
              <FileSpreadsheet className="h-4 w-4 ml-2" />
              رفع Excel
            </Button>
            <Button
              variant={inputMethod === "manual" ? "default" : "outline"}
              className={`flex-1 ${inputMethod === "manual" ? "bg-blue-500" : "bg-transparent"}`}
              onClick={() => setInputMethod("manual")}
            >
              <Keyboard className="h-4 w-4 ml-2" />
              إدخال يدوي
            </Button>
          </div>

          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />

          <div className="bg-blue-50 p-3 rounded-lg mb-4 text-right text-sm">
            <p className="font-medium text-blue-800">تنسيق الأرقام:</p>
            <ul className="list-disc list-inside text-blue-600 mt-1">
              <li>رقم واحد في كل سطر</li>
              <li>مثال: 500000000 أو 0500000000</li>
            </ul>
          </div>

          <Textarea
            value={phoneNumbers}
            onChange={(e) => setPhoneNumbers(e.target.value)}
            placeholder="أدخل الأرقام هنا ... (كل رقم في سطر)"
            className="min-h-[200px] text-right resize-none font-mono"
            dir="rtl"
          />

          <div className="flex justify-between mt-3 p-3 bg-gray-50 rounded-lg">
            {validNumbers.invalid.length > 0 && (
              <div className="text-red-500 font-medium">خاطئة: {validNumbers.invalid.length}</div>
            )}
            <div className="text-green-600 font-medium">صحيحة: {validNumbers.valid.length}</div>
          </div>
        </CardContent>
      </Card>

      {/* شريط التقدم */}
      {sendingStatus === "sending" && (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-bold text-amber-600">
                {sendingCurrent} / {sendingTotal}
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                <span className="text-lg font-medium text-amber-800">جاري الإرسال...</span>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 to-amber-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${sendingProgress}%` }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <div className="flex gap-4">
                <span className="text-green-600 font-medium">ناجح: {sentCount}</span>
                <span className="text-red-500 font-medium">فاشل: {failedCount}</span>
              </div>
              <span className="text-gray-600">المتبقي: {sendingTotal - sendingCurrent} رسالة</span>
            </div>
            <div className="text-center text-gray-500 text-sm mt-2">{sendingProgress}%</div>
          </CardContent>
        </Card>
      )}

      {/* زر الإرسال */}
      <Button
        onClick={handleSendFreeMessages}
        disabled={
          sendingStatus === "sending" ||
          validNumbers.valid.length === 0 ||
          (useTemplate ? !selectedTemplate : !messageText.trim()) ||
          (useTemplate && templateHasImage && !selectedMedia)
        }
        className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-600 hover:to-purple-700 disabled:opacity-50"
      >
        {sendingStatus === "sending" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin ml-2" />
            جاري الإرسال...
          </>
        ) : (
          <>
            <Send className="h-5 w-5 ml-2" />
            إرسال إلى {validNumbers.valid.length} رقم
          </>
        )}
      </Button>

      {/* نافذة اختيار رمز الدولة */}
      <Dialog open={countryCodeDialogOpen} onOpenChange={setCountryCodeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">اختر رمز الدولة</DialogTitle>
            <DialogDescription className="text-right">سيتم إضافة رمز الدولة للأرقام تلقائياً</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {Object.entries(countryNames).map(([code, name]) => (
              <button
                key={code}
                onClick={() => {
                  setSelectedCountry(code)
                  setCountryCodeDialogOpen(false)
                }}
                className={`p-4 rounded-lg border-2 text-right transition-all flex items-center justify-between ${
                  selectedCountry === code ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-300"
                }`}
              >
                <span className="text-2xl">{countryFlags[code]}</span>
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-sm text-gray-500">+{countryCodes[code]}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة مكتبة الصور */}
      <Dialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">مكتبة الصور</DialogTitle>
            <DialogDescription className="text-right">اختر صورة من المكتبة</DialogDescription>
          </DialogHeader>
          {loadingMedia ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : mediaLibrary.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
              {mediaLibrary.map((media) => (
                <button
                  key={media.id}
                  onClick={() => handleMediaSelect(media)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    selectedMedia?.id === media.id ? "border-emerald-500 ring-2 ring-emerald-200" : "border-gray-200"
                  }`}
                >
                  <img
                    src={media.media_url || `/api/media-proxy?media_id=${media.media_id}&user_id=${userId}`}
                    alt={media.file_name}
                    className="w-full h-full object-cover"
                  />
                  {selectedMedia?.id === media.id && (
                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد صور في المكتبة</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة نتائج الإرسال */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">نتائج الإرسال</DialogTitle>
            <DialogDescription className="text-center">تم اكتمال عملية إرسال الرسائل</DialogDescription>
          </DialogHeader>
          {sendResult && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
                <span className="text-3xl font-bold text-green-600">{sendResult.sent}</span>
                <div className="flex items-center gap-2 text-green-700">
                  <span>الرسائل المرسلة بنجاح</span>
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200 flex items-center justify-between">
                <span className="text-3xl font-bold text-red-600">{sendResult.failed}</span>
                <div className="flex items-center gap-2 text-red-700">
                  <span>الرسائل الفاشلة</span>
                  <XCircle className="h-6 w-6" />
                </div>
              </div>
              <Button
                onClick={() => setShowResultDialog(false)}
                className="w-full bg-gradient-to-r from-emerald-500 to-purple-600"
              >
                إغلاق
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
