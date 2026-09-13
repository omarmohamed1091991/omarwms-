import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import CreateUserForm from "@/components/users/create-user-form"

export default function NewUserPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/users" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="o-wms Logo"
                width={50}
                height={50}
                className="w-10 h-10 sm:w-12 sm:h-12"
              />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-blue-900">إضافة مستخدم جديد</h1>
                <p className="text-xs sm:text-sm text-gray-600">نظام واتساب o-wms</p>
              </div>
            </Link>
            <Link href="/users">
              <Button variant="outline" className="gap-2 bg-transparent">
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
        <CreateUserForm />
      </div>
    </div>
  )
}
