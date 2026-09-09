"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Settings,
  MessageSquare,
  Users,
  Inbox,
  Images,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Menu,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface UserSidebarProps {
  userId: string
  userName: string
  userPhone?: string
}

export function UserSidebar({ userId, userName, userPhone }: UserSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    {
      href: `/users/${userId}`,
      label: "لوحة التحكم",
      icon: LayoutDashboard,
      exact: true,
      gradient: "from-blue-500 to-blue-600",
      bgHover: "hover:bg-blue-50",
    },
    {
      href: `/users/${userId}/individual`,
      label: "رسائل فردية",
      icon: MessageSquare,
      gradient: "from-indigo-500 to-indigo-600",
      bgHover: "hover:bg-indigo-50",
    },
    {
      href: `/users/${userId}/bulk`,
      label: "رسائل جماعية",
      icon: Users,
      gradient: "from-emerald-500 to-emerald-600",
      bgHover: "hover:bg-emerald-50",
    },
    {
      href: `/users/${userId}/free-messages`,
      label: "رسائل حرة",
      icon: MessageSquareText,
      gradient: "from-purple-500 to-purple-600",
      bgHover: "hover:bg-purple-50",
    },
    {
      href: `/users/${userId}/inbox`,
      label: "صندوق الوارد",
      icon: Inbox,
      gradient: "from-green-500 to-green-600",
      bgHover: "hover:bg-green-50",
    },
    {
      href: `/users/${userId}/media`,
      label: "مكتبة الصور",
      icon: Images,
      gradient: "from-amber-500 to-amber-600",
      bgHover: "hover:bg-amber-50",
    },
    {
      href: `/users/${userId}/settings`,
      label: "الإعدادات",
      icon: Settings,
      gradient: "from-slate-500 to-slate-600",
      bgHover: "hover:bg-slate-50",
    },
  ]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-100">
        <Link href="/users" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
            <Image
              src="/logo.png"
              alt="o-wms Logo"
              width={48}
              height={48}
              className="object-contain relative z-10"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-700 bg-clip-text text-transparent">
              o-wms
            </span>
            <span className="text-[10px] text-gray-400">نظام واتساب</span>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-green-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-green-700 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            {userName?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>
            {userPhone && (
              <p className="text-xs text-gray-500 truncate" dir="ltr">
                {userPhone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && setIsOpen(false)}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
                isActive
                  ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg shadow-${item.gradient.split("-")[1]}-500/25`
                  : `text-gray-600 ${item.bgHover} hover:text-gray-900`,
              )}
              style={{
                animationDelay: mounted ? `${index * 50}ms` : "0ms",
              }}
            >
              {/* Animated Background */}
              {!isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              )}

              <div
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-300",
                  isActive ? "bg-white/20" : `bg-gradient-to-r ${item.gradient} bg-opacity-10 group-hover:scale-110`,
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-all duration-300",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-gray-700",
                  )}
                />
              </div>

              <span className="relative z-10">{item.label}</span>

              {/* Active Indicator */}
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-3 border-t border-gray-100 space-y-2">
        {/* Back to Home */}
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
            <Home className="w-4 h-4" />
          </div>
          <span>الصفحة الرئيسية</span>
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-64 bg-white border-l border-gray-200 shadow-xl z-40 flex-col">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm z-50">
        <div className="flex items-center justify-between h-full px-4">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                <Menu className="h-5 w-5 relative z-10" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>القائمة</SheetTitle>
              </SheetHeader>
              <NavContent isMobile />
            </SheetContent>
          </Sheet>

          <Link href="/users" className="flex items-center gap-2">
            <Image src="/logo.png" alt="o-wms Logo" width={36} height={36} className="object-contain" />
            <span className="text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-700 bg-clip-text text-transparent">
              o-wms
            </span>
          </Link>

          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-green-700 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {userName?.charAt(0) || "U"}
          </div>
        </div>
      </header>

      {/* Spacer for mobile header only */}
      <div className="lg:hidden h-16" />
    </>
  )
}
