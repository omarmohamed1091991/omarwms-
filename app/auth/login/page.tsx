import { LoginForm } from "@/components/auth/login-form"
import Image from "next/image"
import Link from "next/link"

export default function LoginPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_URL_2
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <Image src="/logo.png" alt="o-wms" width={48} height={48} className="w-12 h-12" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">
              o-wms
            </h1>
          </Link>
          <p className="text-sm text-gray-600">نظام إدارة رسائل واتساب</p>
        </div>

        <LoginForm supabaseUrl={supabaseUrl} supabaseKey={supabaseKey} />

        <p className="text-center text-xs text-gray-500 mt-6">
          جميع الحقوق محفوظة © {new Date().getFullYear()} o-wms
        </p>
      </div>
    </div>
  )
}
