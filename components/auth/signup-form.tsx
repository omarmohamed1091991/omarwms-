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
import { AlertCircle, Loader2, UserPlus } from "lucide-react"
import { registerUser } from "@/app/actions/register"

export function SignupForm({ next }: { next?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: "", phone_number: "", email: "", password: "" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    setLoading(true)
    setError(null)
    try {
      const result = await registerUser(form)
      if (!result.success) {
        setError(result.error)
        setLoading(false)
        return
      }
      // الحساب مفعل مباشرة، لذا نسجّل الدخول تلقائياً.
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password })
      if (signInError) {
        router.push(next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login")
        return
      }
      router.push(next || `/users/${result.userId}/subscription`)
      router.refresh()
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى")
      setLoading(false)
    }
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
        <CardDescription className="text-center text-sm">أنشئ حسابك وابدأ مباشرة بدون رسالة تفعيل</CardDescription>
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
