"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Copy, RefreshCw, Globe, Phone, AlertTriangle } from "lucide-react"
import { saveWhatsAppSettings, getWhatsAppSettings } from "@/app/users/[userId]/settings/actions"

function cleanAccessToken(token: string): string {
  if (!token) return ""

  const cleaned = token
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r?\n|\r/g, "")
    .replace(/\s+/g, "")
    .trim()

  console.log("[v0] Token cleaning - Original length:", token.length)
  console.log("[v0] Token cleaning - Cleaned length:", cleaned.length)
  console.log("[v0] Token cleaning - Removed chars:", token.length - cleaned.length)

  return cleaned
}

export function WhatsAppSettingsForm({ userId }: { userId: string }) {
  const [formData, setFormData] = useState({
    whatsapp_access_token: "",
    whatsapp_business_account_id: "",
    whatsapp_phone_number_id: "",
    whatsapp_webhook_verify_token: "",
  })

  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [statusMessage, setStatusMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const getWebhookUrl = () => {
    if (typeof window !== "undefined") {
      const host = window.location.host
      // إذا كان في المعاينة، استخدم رابط الموقع المنشور
      if (host.includes("vusercontent.net") || host.includes("localhost")) {
        return `https://v0-whatsapp-rosesmile.vercel.app/api/webhooks/${userId}`
      }
      // خلاف ذلك، استخدم الدومين الحالي
      return `${window.location.protocol}//${host}/api/webhooks/${userId}`
    }
    // في server-side، استخدم الرابط المنشور
    return `https://v0-whatsapp-rosesmile.vercel.app/api/webhooks/${userId}`
  }

  const webhookUrl = getWebhookUrl()

  console.log("[v0] User webhook configuration:", {
    userId,
    webhookUrl,
    verifyToken: formData.whatsapp_webhook_verify_token,
    currentHost: typeof window !== "undefined" ? window.location.host : "server",
  })

  function generateVerifyToken() {
    return (
      "whatsapp_verify_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    )
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const regenerateToken = () => {
    setFormData((prev) => ({
      ...prev,
      whatsapp_webhook_verify_token: generateVerifyToken(),
    }))
  }

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getWhatsAppSettings(userId)
      if (settings) {
        setFormData({
          whatsapp_access_token: settings.whatsapp_access_token || "",
          whatsapp_business_account_id: settings.whatsapp_business_account_id || "",
          whatsapp_phone_number_id: settings.whatsapp_phone_number_id || "",
          whatsapp_webhook_verify_token: settings.whatsapp_webhook_verify_token || generateVerifyToken(),
        })
        if (settings.whatsapp_connection_status === "connected") {
          setConnectionStatus("success")
          setStatusMessage("متصل")
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          whatsapp_webhook_verify_token: generateVerifyToken(),
        }))
      }
    }
    loadSettings()
  }, [userId])

  const testConnection = async () => {
    setConnectionStatus("testing")
    setStatusMessage("جاري اختبار الاتصال...")

    try {
      const cleanToken = cleanAccessToken(formData.whatsapp_access_token)

      console.log("[v0] Testing connection with cleaned token")
      console.log("[v0] Token length:", cleanToken.length)
      console.log("[v0] Token first 30:", cleanToken.substring(0, 30))
      console.log("[v0] Token last 30:", cleanToken.slice(-30))
      console.log("[v0] Token contains space:", cleanToken.includes(" "))
      console.log("[v0] Token contains plus:", cleanToken.includes("+"))

      const response = await fetch(`https://graph.facebook.com/v21.0/${formData.whatsapp_business_account_id}`, {
        headers: {
          Authorization: "Bearer " + cleanToken,
        },
      })

      const data = await response.json()
      console.log("[v0] Connection test response:", data)

      if (response.ok && data.id) {
        setConnectionStatus("success")
        setStatusMessage("تم الاتصال بنجاح! ✓")

        await saveSettings()
      } else {
        setConnectionStatus("error")

        let errorMsg = ""
        if (data.error?.code === 190) {
          if (data.error?.message?.includes("could not be decrypted")) {
            errorMsg =
              "❌ رمز الوصول منتهي الصلاحية أو غير صحيح!\n\n" +
              "الحل:\n" +
              "1. اذهب إلى Meta Business Suite (business.facebook.com)\n" +
              "2. اختر تطبيقك → إعدادات النظام → رموز الوصول\n" +
              "3. أنشئ رمز وصول جديد من نوع 'System User Token'\n" +
              "4. تأكد من اختيار الصلاحيات المناسبة (whatsapp_business_messaging)\n" +
              "5. انسخ الرمز الجديد والصقه هنا"
          } else if (data.error?.message?.includes("Malformed")) {
            errorMsg =
              "❌ تنسيق رمز الوصول غير صحيح!\n\n" +
              "تأكد من:\n" +
              "• نسخ الرمز كاملاً من Meta (استخدم زر Copy)\n" +
              "• عدم وجود مسافات أو أحرف إضافية\n" +
              "• الرمز الصحيح يبدأ بـ EAAa... ويكون طويلاً (عادة 200+ حرف)"
          } else {
            errorMsg = "❌ رمز الوصول غير صالح!\n" + data.error?.message
          }
        } else {
          errorMsg = "❌ فشل الاتصال: " + (data.error?.message || "خطأ غير معروف")
        }

        setStatusMessage(errorMsg)
        alert(errorMsg)
        console.error("[v0] Connection test failed:", data)
      }
    } catch (error: any) {
      setConnectionStatus("error")
      setStatusMessage("خطأ في الاتصال: " + (error.message || "خطأ غير معروف"))
      console.error("[v0] Connection test error:", error)
    }
  }

  const hasRequiredData = () => {
    return (
      formData.whatsapp_access_token.trim().length > 0 &&
      formData.whatsapp_business_account_id.trim().length > 0 &&
      formData.whatsapp_phone_number_id.trim().length > 0
    )
  }

  const saveSettings = async () => {
    if (!hasRequiredData()) {
      alert("يرجى إدخال جميع البيانات المطلوبة")
      return
    }

    setIsSaving(true)
    try {
      const cleanToken = cleanAccessToken(formData.whatsapp_access_token)

      console.log("[v0] Saving new settings - deleting old data...")
      console.log("[v0] Cleaned token length:", cleanToken.length)
      console.log("[v0] Cleaned token last 30:", cleanToken.slice(-30))
      console.log("[v0] Token contains space:", cleanToken.includes(" "))

      const result = await saveWhatsAppSettings(userId, {
        whatsapp_access_token: cleanToken,
        whatsapp_business_account_id: formData.whatsapp_business_account_id.trim(),
        whatsapp_phone_number_id: formData.whatsapp_phone_number_id.trim(),
        whatsapp_webhook_verify_token: formData.whatsapp_webhook_verify_token,
        whatsapp_connection_status: "disconnected",
      })

      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          whatsapp_access_token: cleanToken,
        }))
        setConnectionStatus("idle")
        setStatusMessage("")
        console.log("[v0] New settings saved successfully, old data replaced")
        alert("تم حفظ الإعدادات الجديدة بنجاح! ✓\nيمكنك الآن اختبار الاتصال.")
      } else {
        throw new Error(result.error || "فشل حفظ الإعدادات")
      }
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      alert("فشل حفظ الإعدادات: " + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const fetchTemplatesFromAPI = async () => {
    setIsLoadingTemplates(true)
    try {
      console.log("[v0] Fetching templates from WhatsApp API...")

      const cleanToken = cleanAccessToken(formData.whatsapp_access_token)
      console.log("[v0] Token length:", cleanToken.length)
      console.log("[v0] Token last 30:", cleanToken.slice(-30))
      console.log("[v0] Token contains space:", cleanToken.includes(" "))

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${formData.whatsapp_business_account_id}/message_templates`,
        {
          headers: {
            Authorization: "Bearer " + cleanToken,
          },
        },
      )

      const data = await response.json()
      console.log("[v0] Templates API response:", data)

      if (response.ok && data.data) {
        setTemplates(data.data)
        alert(`تم جلب ${data.data.length} قالب بنجاح`)
      } else {
        console.error("[v0] WhatsApp API error:", data.error?.message)
        alert("فشل جلب القوالب: " + (data.error?.message || "خطأ غير معروف"))
      }
    } catch (error) {
      console.error("[v0] Error fetching templates:", error)
      alert("خطأ في جلب القوالب")
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-500 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg text-blue-900">عنوان URL للـ Webhook</CardTitle>
              <p className="text-xs text-blue-600 mt-1">
                استخدم هذه المعلومات لتكوين Webhook في Meta Developer Console
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-900 text-sm mb-2">⚠️ تنبيه مهم جداً: لكل مستخدم تطبيق Meta منفصل!</h4>
                <div className="text-sm text-red-800 space-y-2">
                  <p className="font-semibold">يجب على كل مستخدم:</p>
                  <ul className="list-disc list-inside space-y-1 mr-4">
                    <li>
                      إنشاء <strong>تطبيق Meta Developer خاص به</strong>
                    </li>
                    <li>
                      ربط <strong>رقم WhatsApp Business خاص به</strong>
                    </li>
                    <li>
                      تسجيل <strong>webhook URL الخاص به فقط</strong> (أدناه)
                    </li>
                    <li>❌ لا تستخدم webhook أو تطبيق شخص آخر</li>
                  </ul>
                  <div className="bg-red-100 border border-red-300 rounded p-3 mt-3">
                    <p className="font-bold text-red-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      لماذا رسائلي تظهر عند مستخدم آخر؟
                    </p>
                    <p className="text-xs mt-1">
                      <strong>السبب:</strong> أنت تستخدم نفس تطبيق Meta أو webhook URL لمستخدم آخر!
                    </p>
                    <p className="text-xs mt-1">
                      <strong>الحل:</strong> اتبع الدليل التفصيلي (META_SETUP_GUIDE.md) لإنشاء تطبيقك الخاص
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shrink-0">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-blue-900 text-sm mb-2">📋 Webhook URL الخاص بك (لا تشاركه مع أحد!)</h4>
                <p className="text-xs text-blue-700 mb-3">
                  سجل هذا الرابط في <strong>حسابك الخاص</strong> على Meta Developer Console
                </p>
                <div className="bg-white border-2 border-blue-300 rounded p-2 font-mono text-xs break-all select-all">
                  {webhookUrl}
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => copyToClipboard(webhookUrl, "webhook")}
                  className="bg-blue-600 hover:bg-blue-700 mt-2 w-full"
                >
                  {copied === "webhook" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      تم النسخ ✓
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 ml-2" />
                      انسخ Webhook URL
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold text-green-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                رمز التحقق (Verify Token)
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={regenerateToken}
                className="text-green-700 hover:text-green-900 hover:bg-green-100 h-7 px-2"
              >
                <RefreshCw className="w-3 h-3 ml-1" />
                إنشاء جديد
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={formData.whatsapp_webhook_verify_token}
                readOnly
                className="font-mono text-xs sm:text-sm bg-white border-green-300 text-green-700 select-all"
                dir="ltr"
              />
              <Button
                variant="default"
                size="sm"
                onClick={() => copyToClipboard(formData.whatsapp_webhook_verify_token, "verify")}
                className="bg-green-600 hover:bg-green-700 shrink-0"
              >
                {copied === "verify" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    تم النسخ
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 ml-2" />
                    نسخ
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-green-700 mt-2">استخدم هذا الرمز عند تكوين Webhook في Meta</p>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              خطوات تكوين Webhook في Meta Developer Console
            </h4>
            <ol className="text-xs text-indigo-800 space-y-2 mr-4 list-decimal">
              <li>
                اذهب إلى{" "}
                <a
                  href="https://developers.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                >
                  Meta for Developers
                </a>
              </li>
              <li>اختر تطبيقك → WhatsApp → الإعدادات → Webhooks</li>
              <li>اضغط على "Configure Webhooks" أو "Edit"</li>
              <li>
                الصق <span className="font-semibold text-indigo-900">عنوان URL</span> أعلاه في حقل "Callback URL"
              </li>
              <li>
                الصق <span className="font-semibold text-indigo-900">رمز التحقق</span> أعلاه في حقل "Verify Token"
              </li>
              <li>اضغط "Verify and Save"</li>
              <li>اشترك في الأحداث المطلوبة (messages, message_status)</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* بطاقة إعدادات WhatsApp API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            إعدادات WhatsApp Business API
          </CardTitle>
          <CardDescription>قم بتكوين WhatsApp Business API لإرسال الرسائل</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* حالة الاتصال */}
          {connectionStatus !== "idle" && (
            <Alert
              className={
                connectionStatus === "success"
                  ? "bg-green-50 border-green-200"
                  : connectionStatus === "error"
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200"
              }
            >
              <div className="flex items-center gap-2">
                {connectionStatus === "success" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {connectionStatus === "error" && <XCircle className="w-4 h-4 text-red-600" />}
                {connectionStatus === "testing" && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
                <AlertDescription
                  className={
                    connectionStatus === "success"
                      ? "text-green-900"
                      : connectionStatus === "error"
                        ? "text-red-900"
                        : "text-blue-900"
                  }
                >
                  {statusMessage}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* معرف حساب الأعمال */}
          <div>
            <Label htmlFor="business_account">معرف حساب الأعمال (Business Account ID)</Label>
            <Input
              id="business_account"
              value={formData.whatsapp_business_account_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  whatsapp_business_account_id: e.target.value.trim(),
                })
              }
              placeholder="1234567890"
              className="font-mono"
              dir="ltr"
            />
          </div>

          {/* معرف رقم الهاتف */}
          <div>
            <Label htmlFor="phone_number">معرف رقم الهاتف (Phone Number ID)</Label>
            <Input
              id="phone_number"
              value={formData.whatsapp_phone_number_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  whatsapp_phone_number_id: e.target.value.trim(),
                })
              }
              placeholder="0987654321"
              className="font-mono"
              dir="ltr"
            />
          </div>

          {/* رمز الوصول */}
          <div>
            <Label htmlFor="access_token">رمز الوصول (Access Token)</Label>
            <Input
              id="access_token"
              type="text"
              value={formData.whatsapp_access_token}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  whatsapp_access_token: e.target.value,
                })
              }
              placeholder="EAAxxxxxxxxxxxxx"
              className="font-mono text-xs"
              dir="ltr"
            />
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs font-semibold text-blue-900 mb-2">كيفية الحصول على رمز وصول صحيح:</p>
              <ol className="text-xs text-blue-800 space-y-1 mr-4 list-decimal">
                <li>
                  اذهب إلى{" "}
                  <a
                    href="https://business.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold"
                  >
                    Meta Business Suite
                  </a>
                </li>
                <li>اختر تطبيقك → إعدادات النظام → رموز الوصول</li>
                <li>أنشئ رمز وصول جديد من نوع "System User Token"</li>
                <li>اختر الصلاحيات: whatsapp_business_messaging</li>
                <li>انسخ الرمز كاملاً (يبدأ بـ EAAa...)</li>
              </ol>
              <p className="text-xs text-blue-700 mt-2 font-medium">
                ⚠️ الرمز الصحيح يكون طويلاً (200+ حرف) ولا ينتهي صلاحيته
              </p>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={testConnection}
              disabled={
                connectionStatus === "testing" ||
                !formData.whatsapp_access_token ||
                !formData.whatsapp_business_account_id
              }
              className="flex-1 min-w-[120px]"
            >
              {connectionStatus === "testing" ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  جاري الاختبار...
                </>
              ) : (
                "اختبار الاتصال"
              )}
            </Button>

            <Button
              onClick={fetchTemplatesFromAPI}
              disabled={isLoadingTemplates || connectionStatus !== "success"}
              variant="outline"
              className="flex-1 min-w-[120px] bg-transparent"
            >
              {isLoadingTemplates ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  جاري الجلب...
                </>
              ) : (
                "جلب القوالب"
              )}
            </Button>

            <Button
              onClick={saveSettings}
              disabled={isSaving || !hasRequiredData()}
              variant="default"
              className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ الإعدادات"
              )}
            </Button>
          </div>

          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-sm text-amber-900">
              💡 عند حفظ إعدادات جديدة، سيتم استبدال البيانات القديمة تلقائياً. تأكد من اختبار الاتصال بعد الحفظ للتحقق
              من صحة الإعدادات.
            </AlertDescription>
          </Alert>

          {/* عرض القوالب */}
          {templates.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-3">القوالب المتاحة ({templates.length})</h3>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{template.language}</p>
                      </div>
                      <Badge variant={template.status === "APPROVED" ? "default" : "secondary"} className="text-xs">
                        {template.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WhatsAppSettingsForm
