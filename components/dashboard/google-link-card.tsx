"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { UserIdentity } from "@supabase/supabase-js"
import { CheckCircle2, Link2, Loader2, Unlink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GoogleIcon } from "@/components/auth/google-sign-in-button"

const LINK_ERRORS: Record<string, string> = {
  exists: "حساب جوجل هذا مرتبط بالفعل بحساب آخر على المنصة. استخدم حساب جوجل مختلفاً.",
  disabled: "ربط الحسابات غير مفعّل حالياً على المنصة. يرجى التواصل مع الدعم.",
  failed: "تعذر إكمال ربط حساب جوجل، حاول مرة أخرى.",
}

// بطاقة ربط حساب جوجل بالحساب الحالي (المنشأ بالبريد وكلمة المرور) ليتمكن المستخدم لاحقاً من الدخول عبر جوجل.
export function GoogleLinkCard() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const status = searchParams.get("google_link")

  const [identities, setIdentities] = useState<UserIdentity[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(status && status !== "success" ? LINK_ERRORS[status] || LINK_ERRORS.failed : null)
  const [success, setSuccess] = useState<string | null>(status === "success" ? "تم ربط حساب جوجل بنجاح، يمكنك الآن تسجيل الدخول باستخدام جوجل." : null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error: idError } = await supabase.auth.getUserIdentities()
    if (idError) {
      console.error("[google-link] Failed to load identities:", idError)
      setIdentities([])
      return
    }
    setIdentities(data?.identities || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // إزالة معامل الحالة من الرابط بعد عرض الرسالة.
  useEffect(() => {
    if (!status) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete("google_link")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [status, pathname, router, searchParams])

  const google = identities?.find((i) => i.provider === "google")
  const canUnlink = !!google && (identities?.length || 0) > 1
  const googleEmail = (google?.identity_data as Record<string, string> | undefined)?.email

  async function handleLink() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const supabase = createClient()
      const callback = new URL("/auth/callback", window.location.origin)
      callback.searchParams.set("next", pathname)
      callback.searchParams.set("link", "google")
      const { error: linkError } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
      })
      if (linkError) throw linkError
    } catch (err) {
      console.error("[google-link] Link start failed:", err)
      const msg = err instanceof Error ? err.message.toLowerCase() : ""
      setError(msg.includes("manual linking") ? LINK_ERRORS.disabled : "تعذر بدء ربط حساب جوجل، حاول مرة أخرى.")
      setLoading(false)
    }
  }

  async function handleUnlink() {
    if (!google || !canUnlink) return
    if (!window.confirm("هل تريد إلغاء ربط حساب جوجل؟ لن تتمكن من الدخول عبر جوجل بعد ذلك.")) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    const supabase = createClient()
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(google)
    if (unlinkError) {
      console.error("[google-link] Unlink failed:", unlinkError)
      setError("تعذر إلغاء ربط حساب جوجل، حاول مرة أخرى.")
    } else {
      setSuccess("تم إلغاء ربط حساب جوجل.")
      await load()
    }
    setLoading(false)
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          الحسابات المرتبطة
        </CardTitle>
        <CardDescription>اربط حسابك بجوجل لتتمكن من تسجيل الدخول بنقرة واحدة باستخدام حساب جوجل.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <GoogleIcon />
            <div>
              <p className="font-medium text-gray-900">جوجل</p>
              {identities === null ? (
                <p className="text-sm text-gray-500">جارٍ التحقق...</p>
              ) : google ? (
                <p className="text-sm text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  مرتبط{googleEmail ? ` (${googleEmail})` : ""}
                </p>
              ) : (
                <p className="text-sm text-gray-500">غير مرتبط</p>
              )}
            </div>
          </div>
          {identities !== null &&
            (google ? (
              canUnlink && (
                <Button type="button" variant="outline" onClick={handleUnlink} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                  إلغاء الربط
                </Button>
              )
            ) : (
              <Button type="button" variant="outline" onClick={handleLink} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                ربط مع جوجل
              </Button>
            ))}
        </div>
        {success && <p className="text-sm text-green-700">{success}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
