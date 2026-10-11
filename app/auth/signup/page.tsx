import Image from "next/image"
import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import { safeNext } from "@/lib/utils"

export const metadata = { title: "إنشاء حساب | o-wms" }

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <Image src="/logo.png" alt="o-wms" width={48} height={48} className="w-12 h-12" />
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">
              o-wms
            </span>
          </Link>
          <p className="text-sm text-gray-600">أنشئ حسابك واختر الباقة المناسبة</p>
        </div>
        <SignupForm next={safeNext(next)} />
        <p className="text-center text-xs text-gray-500 mt-6">
          بالتسجيل فإنك توافق على <Link href="/terms" className="underline">الشروط والأحكام</Link> و
          <Link href="/privacy-policy" className="underline">سياسة الخصوصية</Link>
        </p>
      </div>
    </div>
  )
}
