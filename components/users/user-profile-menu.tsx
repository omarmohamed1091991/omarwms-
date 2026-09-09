"use client"

import { useState } from "react"
import Link from "next/link"
import { User, Settings, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface UserProfileMenuProps {
  user: {
    id: string
    full_name: string | null
    phone_number: string
  }
  userId: string
}

export function UserProfileMenu({ user, userId }: UserProfileMenuProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-4 hover:bg-gray-50 rounded-lg p-2 transition-colors">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{user.full_name || "بدون اسم"}</p>
            <p className="text-xs text-gray-500 font-mono">{user.phone_number}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-900 flex items-center justify-center text-white text-lg font-bold cursor-pointer hover:shadow-lg transition-shadow">
            {user.full_name?.charAt(0) || user.phone_number.charAt(0)}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.full_name || "بدون اسم"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.phone_number}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/users/${userId}/profile`} className="cursor-pointer">
            <User className="ml-2 h-4 w-4" />
            <span>تعديل الملف الشخصي</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/users/${userId}/settings`} className="cursor-pointer">
            <Settings className="ml-2 h-4 w-4" />
            <span>إعدادات واتساب</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="text-red-600 cursor-pointer">
          <LogOut className="ml-2 h-4 w-4" />
          <span>{isLoggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
