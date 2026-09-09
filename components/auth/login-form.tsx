"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, LogIn, Mail, Lock, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة")
        setLoading(false)
        return
      }

      if (!data.user) {
        setError("حدث خطأ في تسجيل الدخول")
        setLoading(false)
        return
      }

      const { data: profile } = await supabase.from("user_profiles").select("role, id").eq("id", data.user.id).single()

      if (profile?.role === "admin") {
        router.push("/users")
      } else {
        router.push(`/users/${data.user.id}`)
      }

      router.refresh()
    } catch (err) {
      setError("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى")
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-xl font-bold text-center">تسجيل الدخول</CardTitle>
        <CardDescription className="text-center text-sm">أدخل بياناتك للوصول إلى لوحة التحكم</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-4 h-4 text-gray-500" />
              البريد الإلكتروني
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@rosesmile.com"
              className="h-11"
              disabled={loading}
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
              <Lock className="w-4 h-4 text-gray-500" />
              كلمة المرور
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="h-11"
              disabled={loading}
              dir="ltr"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                جاري تسجيل الدخول...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 ml-2" />
                تسجيل الدخول
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
