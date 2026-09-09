"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Settings, MessageSquare, Users, Inbox, Images, LayoutDashboard, LogOut, MessageSquareText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface UserNavProps {
  userId: string
  userName: string
}

export function UserNav({ userId, userName }: UserNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      href: `/users/${userId}`,
      label: "لوحة التحكم",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: `/users/${userId}/individual`,
      label: "رسائل فردية",
      icon: MessageSquare,
    },
    {
      href: `/users/${userId}/bulk`,
      label: "رسائل جماعية",
      icon: Users,
    },
    {
      href: `/users/${userId}/free-messages`,
      label: "رسائل حرة",
      icon: MessageSquareText,
    },
    {
      href: `/users/${userId}/inbox`,
      label: "صندوق الوارد",
      icon: Inbox,
    },
    {
      href: `/users/${userId}/media`,
      label: "مكتبة الصور",
      icon: Images,
    },
    {
      href: `/users/${userId}/settings`,
      label: "الإعدادات",
      icon: Settings,
    },
  ]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto py-2 scrollbar-hide">
          <div className="flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                    isActive
                      ? "bg-gradient-to-r from-pink-500 to-blue-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <Button
            onClick={handleLogout}
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2.5 border-red-200 text-red-600 hover:bg-red-50 whitespace-nowrap bg-transparent"
          >
            <LogOut className="w-3 h-3 ml-1" />
            خروج
          </Button>
        </div>
      </div>
    </nav>
  )
}
