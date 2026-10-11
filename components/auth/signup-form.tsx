"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react"

export function SignupForm({ next }: { next?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)
  const [form, setForm] = useState({ full_name: "", phone_number: "", email: "", password: "" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const destination = next || "/#pricing"
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name, phone_number: form.phone_number },
          emailRedirectTo: `${window.location.origin}/auth/login?next=${encodeURIComponent(destination)}`,
        },
      })
      if (signUpError) {
        setError(signUpError.message.includes("registered") ? "هذا البريد مسجل بالفعل، يرجى تسجيل الدخول" : "تعذر إنشاء الحساب، حاول مرة أخرى")
        setLoading(false)
        return
      }
      if (!data.session) {
        setCheckEmail(true)
        setLoading(false)
        return
      }
      router.push(next || `/users/${data.user!.id}/subscription`)
      router.refresh()
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى")
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <Card className="border-0 shadow-xl">
        <CardContent className="py-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">تم إنشاء حسابك</p>
          <p className="text-sm text-gray-600">أرسلنا رابط تفعيل إلى بريدك الإلكتروني. فعّل حسابك ثم سجّل الدخول لإتمام الاشتراك.</p>
        </CardContent>
      </Card>
    )
  }

  const field = (key: keyof typeof form, label: string, type = "text", ltr = false) => (
    <div className="space-y-2">
      <Label htmlFor={key} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={key}
        type={type}
        required
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="h-11"
        disabled={loading}
        dir={ltr ? "ltr" : undefined}
      />
    </div>
  )

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-xl font-bold text-center">إنشاء حساب جديد</CardTitle>
        <CardDescription className="text-center text-sm">سجّل بياناتك للاشتراك في إحدى الباقات</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {field("full_name", "الاسم الكامل")}
          {field("phone_number", "رقم الهاتف (واتساب)", "tel", true)}
          {field("email", "البريد الإلكتروني", "email", true)}
          {field("password", "كلمة المرور (8 أحرف على الأقل)", "password", true)}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <UserPlus className="w-4 h-4 ml-2" />}
            إنشاء الحساب
          </Button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-6">
          لديك حساب بالفعل؟{" "}
          <Link href={next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login"} className="text-emerald-700 font-medium hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
