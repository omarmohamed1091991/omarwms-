"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CheckCircle2, XCircle, RefreshCw, Zap, ShieldCheck, BookOpen, Info } from "lucide-react"
import { completeMetaEmbeddedSignup } from "@/app/users/[userId]/settings/meta-connect"

declare global {
  interface Window {
    FB?: any
    fbAsyncInit?: () => void
  }
}

export type MetaConnectResult = {
  wabaId: string
  phoneNumberId: string
  accessToken?: string
}

type SessionInfo = { wabaId?: string; phoneNumberId?: string }

const GRAPH_VERSION = "v21.0"

function loadFacebookSdk(appId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve(window.FB)
      return
    }
    window.fbAsyncInit = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: GRAPH_VERSION })
      resolve(window.FB)
    }
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script")
      script.id = "facebook-jssdk"
      script.src = "https://connect.facebook.net/en_US/sdk.js"
      script.async = true
      script.defer = true
      script.crossOrigin = "anonymous"
      script.onerror = () => reject(new Error("تعذّر تحميل مكتبة Meta. تأكد من الاتصال أو من تعطيل مانع الإعلانات"))
      document.body.appendChild(script)
    }
  })
}

export function MetaConnectButton({
  userId,
  appId,
  configId,
  enabled,
  onConnected,
}: {
  userId: string
  appId: string
  configId: string
  enabled: boolean
  onConnected?: (result: MetaConnectResult) => void
}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [details, setDetails] = useState<{
    wabaId: string
    phoneNumberId: string
    displayPhone: string
    pin: string | null
    webhookSubscribed: boolean
    webhookOverride: boolean
    registered: boolean
    registerError: string | null
  } | null>(null)
  const sessionInfo = useRef<SessionInfo>({})

  // تستقبل نافذة Meta بيانات الحساب (WABA ورقم الهاتف) عبر رسالة postMessage
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (typeof event.origin !== "string" || !event.origin.endsWith("facebook.com")) return
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (data?.type !== "WA_EMBEDDED_SIGNUP") return
        if (data.event === "FINISH" || data.event === "FINISH_ONLY_WABA" || data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
          sessionInfo.current = { wabaId: data.data?.waba_id, phoneNumberId: data.data?.phone_number_id }
        } else if (data.event === "CANCEL") {
          setStatus("error")
          setMessage(
            "تم إلغاء الربط قبل اكتماله" + (data.data?.current_step ? ` (عند خطوة: ${data.data.current_step})` : ""),
          )
        } else if (data.event === "ERROR") {
          setStatus("error")
          setMessage("حدث خطأ في نافذة Meta: " + (data.data?.error_message || "خطأ غير معروف"))
        }
      } catch {
        // رسائل أخرى من facebook.com لا تخص الربط
      }
    }
    window.addEventListener("message", listener)
    return () => window.removeEventListener("message", listener)
  }, [])

  const finish = async (code: string) => {
    setStatus("saving")
    setMessage("جاري حفظ بيانات الربط وتفعيل الـ Webhook...")
    // ننتظر قليلاً لوصول بيانات الجلسة إن لم تصل بعد
    for (let i = 0; i < 10 && !sessionInfo.current.wabaId; i++) {
      await new Promise((r) => setTimeout(r, 200))
    }
    const result = await completeMetaEmbeddedSignup(userId, {
      code,
      wabaId: sessionInfo.current.wabaId,
      phoneNumberId: sessionInfo.current.phoneNumberId,
    })
    if (!result.success) {
      setStatus("error")
      setMessage(result.error)
      return
    }
    setStatus("success")
    setMessage("تم ربط واتساب بحسابك بنجاح ✓")
    setDetails({
      wabaId: result.wabaId,
      phoneNumberId: result.phoneNumberId,
      displayPhone: result.displayPhone,
      pin: result.pin,
      webhookSubscribed: result.webhookSubscribed,
      webhookOverride: result.webhookOverride,
      registered: result.registered,
      registerError: result.registerError,
    })
    onConnected?.({ wabaId: result.wabaId, phoneNumberId: result.phoneNumberId })
  }

  const connect = async () => {
    setStatus("connecting")
    setMessage("جاري فتح نافذة Meta... أكمل الخطوات في النافذة المنبثقة")
    setDetails(null)
    sessionInfo.current = {}
    try {
      const FB = await loadFacebookSdk(appId)
      // يجب أن تكون دالة الاستجابة غير async حسب متطلبات مكتبة Meta
      FB.login(
        (response: any) => {
          const code = response?.authResponse?.code
          if (code) {
            finish(code)
          } else {
            setStatus("error")
            setMessage("لم يكتمل تسجيل الدخول إلى Meta أو تم إغلاق النافذة")
          }
        },
        {
          config_id: configId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
        },
      )
    } catch (error: any) {
      setStatus("error")
      setMessage(error?.message || "تعذّر بدء الربط")
    }
  }

  const busy = status === "connecting" || status === "saving"

  return (
    <Card className="border border-emerald-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-emerald-50/70 border-b border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg text-slate-900">ربط واتساب تلقائياً عبر Meta</CardTitle>
            <p className="text-xs text-slate-600 mt-1">
              سجّل الدخول بحساب فيسبوك واختر رقمك، وسنحفظ المعرّفات والتوكن والـ Webhook تلقائياً
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        {enabled ? (
          <Button
            onClick={connect}
            disabled={busy}
            className="w-full h-12 text-base bg-[#1877F2] hover:bg-[#166FE5] text-white"
          >
            {busy ? (
              <>
                <RefreshCw className="w-5 h-5 ml-2 animate-spin" />
                {status === "saving" ? "جاري الحفظ..." : "جاري الربط..."}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5 ml-2 fill-current" aria-hidden="true">
                  <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
                </svg>
                ربط واتساب تلقائياً مع Meta
              </>
            )}
          </Button>
        ) : (
          <Alert className="bg-amber-50 border-amber-200">
            <Info className="w-4 h-4 text-amber-700" />
            <AlertDescription className="text-sm text-amber-900">
              الربط التلقائي غير مفعّل على المنصة بعد. يمكنك استخدام الربط اليدوي أدناه، أو التواصل مع الإدارة لتفعيله.
            </AlertDescription>
          </Alert>
        )}

        {status !== "idle" && (
          <Alert
            className={
              status === "success"
                ? "bg-green-50 border-green-200"
                : status === "error"
                  ? "bg-red-50 border-red-200"
                  : "bg-slate-50 border-slate-200"
            }
          >
            <div className="flex items-start gap-2">
              {status === "success" && <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />}
              {status === "error" && <XCircle className="w-4 h-4 text-red-600 mt-0.5" />}
              {busy && <RefreshCw className="w-4 h-4 text-slate-600 animate-spin mt-0.5" />}
              <AlertDescription className="text-sm whitespace-pre-line">{message}</AlertDescription>
            </div>
          </Alert>
        )}

        {details && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm space-y-2">
            {details.displayPhone && (
              <Row label="رقم الواتساب" value={details.displayPhone} />
            )}
            <Row label="معرّف حساب واتساب (WABA ID)" value={details.wabaId} />
            <Row label="معرّف رقم الهاتف (Phone Number ID)" value={details.phoneNumberId} />
            <Row label="رمز الوصول (Access Token)" value="محفوظ بأمان على الخادم ✓" />
            <Row
              label="الـ Webhook"
              value={
                details.webhookSubscribed
                  ? details.webhookOverride
                    ? "مفعّل على الرابط الخاص بك ✓"
                    : "مفعّل على رابط التطبيق الافتراضي"
                  : "لم يُفعّل، سجّله يدوياً من الأسفل"
              }
            />
            <Row
              label="تسجيل الرقم في Cloud API"
              value={details.registered ? "تم ✓" : "مسجّل مسبقاً أو يحتاج تسجيلاً يدوياً"}
            />
            {details.pin && (
              <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-900 text-xs">
                <ShieldCheck className="inline w-4 h-4 ml-1" />
                رمز التحقق بخطوتين لرقمك هو <span className="font-mono font-bold text-sm">{details.pin}</span>. احتفظ
                به، فلن يظهر مرة أخرى، وقد تحتاجه عند نقل الرقم مستقبلاً.
              </div>
            )}
            {!details.registered && details.registerError && (
              <p className="text-xs text-slate-500">رسالة Meta: {details.registerError}</p>
            )}
          </div>
        )}

        <MetaConnectGuide />
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-mono text-slate-900 text-xs sm:text-sm" dir="ltr">
        {value}
      </span>
    </div>
  )
}

function MetaConnectGuide() {
  return (
    <Accordion type="single" collapsible className="rounded-lg border border-slate-200 bg-slate-50/60 px-4">
      <AccordionItem value="how" className="border-b-0">
        <AccordionTrigger className="text-sm font-semibold text-slate-800 hover:no-underline">
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            شرح طريقة الربط التلقائي مع Meta
          </span>
        </AccordionTrigger>
        <AccordionContent className="text-sm text-slate-700 space-y-4">
          <div>
            <p className="font-semibold text-slate-900 mb-2">قبل البدء تأكد من:</p>
            <ul className="list-disc mr-5 space-y-1">
              <li>وجود حساب فيسبوك شخصي تستطيع الدخول إليه.</li>
              <li>
                رقم هاتف <strong>غير مسجّل حالياً</strong> في تطبيق واتساب أو واتساب للأعمال على الجوال (أو احذف حساب
                واتساب منه أولاً)، ويستقبل رسالة SMS أو مكالمة.
              </li>
              <li>اسم نشاط تجاري وموقع إلكتروني أو صفحة للنشاط (تطلبها Meta للتحقق).</li>
              <li>السماح بالنوافذ المنبثقة (Pop-ups) في المتصفح لهذا الموقع.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-slate-900 mb-2">الخطوات:</p>
            <ol className="list-decimal mr-5 space-y-2">
              <li>
                اضغط زر <strong>«ربط واتساب تلقائياً مع Meta»</strong>، فتظهر نافذة فيسبوك الرسمية.
              </li>
              <li>سجّل الدخول بحساب فيسبوك ووافق على مشاركة البيانات مع المنصة.</li>
              <li>
                اختر <strong>حساب الأعمال (Business Portfolio)</strong> الموجود أو أنشئ حساباً جديداً باسم نشاطك.
              </li>
              <li>
                اختر <strong>حساب واتساب للأعمال (WABA)</strong> أو أنشئ واحداً، واكتب الاسم المعروض الذي سيظهر للعملاء.
              </li>
              <li>أدخل رقم الهاتف، ثم أدخل رمز التحقق الذي يصلك برسالة أو مكالمة.</li>
              <li>
                وافق على الصلاحيات المطلوبة (إدارة واتساب للأعمال وإرسال الرسائل)، ثم اضغط <strong>إنهاء</strong>.
              </li>
              <li>
                تُغلق النافذة تلقائياً، وتقوم المنصة بما يلي دون أي نسخ يدوي:
                <ul className="list-disc mr-5 mt-1 space-y-1 text-slate-600">
                  <li>حفظ معرّف حساب واتساب (WABA ID) ومعرّف رقم الهاتف (Phone Number ID).</li>
                  <li>الحصول على رمز الوصول (Access Token) وحفظه بأمان على الخادم وربطه بحسابك.</li>
                  <li>تسجيل الرقم في WhatsApp Cloud API.</li>
                  <li>
                    تفعيل الـ Webhook على الرابط الخاص بك مع رمز التحقق، لتصلك الرسائل الواردة وحالات التسليم في صندوق
                    الوارد.
                  </li>
                </ul>
              </li>
              <li>
                بعد ظهور رسالة النجاح، اضغط <strong>«اختبار الاتصال»</strong> في الأسفل للتأكد، ثم ابدأ الإرسال.
              </li>
            </ol>
          </div>

          <div>
            <p className="font-semibold text-slate-900 mb-2">ملاحظات مهمة:</p>
            <ul className="list-disc mr-5 space-y-1">
              <li>
                لإرسال الرسائل لعملاء لم يراسلوك خلال آخر 24 ساعة يجب استخدام <strong>قوالب معتمدة</strong> من Meta.
              </li>
              <li>
                أضف <strong>وسيلة دفع</strong> في حساب واتساب للأعمال من Meta Business Suite لتتمكن من إرسال القوالب
                بعد المحادثات المجانية.
              </li>
              <li>
                يبدأ الرقم الجديد بحدّ إرسال يومي، ويرتفع تلقائياً مع الاستخدام الجيد. توثيق النشاط التجاري (Business
                Verification) يرفع الحدود أسرع.
              </li>
              <li>إذا أعدت الربط برقم آخر، تُستبدل البيانات القديمة بالجديدة تلقائياً.</li>
              <li>
                إذا ظهرت رسالة إلغاء أو خطأ، أعد المحاولة. يمكنك دائماً استخدام <strong>الربط اليدوي</strong> بالأسفل.
              </li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default MetaConnectButton
