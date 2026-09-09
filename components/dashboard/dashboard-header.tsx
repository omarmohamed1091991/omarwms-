"use client"

import type { User } from "@supabase/supabase-js"
import type { UserProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageCircle } from "lucide-react"

interface DashboardHeaderProps {
  user: User
  profile: UserProfile | null
}

export function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U"

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
              نظام إرسال رسائل واتساب
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 truncate">{profile?.phone_number}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 sm:px-4">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm">{profile?.full_name || user.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>الملف الشخصي</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>الإعدادات</DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
