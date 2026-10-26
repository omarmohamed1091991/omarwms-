"use client"

import { useState } from "react"
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
  CreditCard,
  ChevronLeft,
  ShieldCheck,
  CalendarCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface UserSidebarProps {
  userId: string
  userName: string
  userPhone?: string
  accountStatus: "active" | "paused" | "suspended"
  isAdmin: boolean
}

export function UserSidebar({ userId, userName, userPhone, accountStatus, isAdmin }: UserSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const navGroups = [
    {
      title: "الرئيسية",
      items: [{ href: `/users/${userId}`, label: "لوحة التحكم", icon: LayoutDashboard, exact: true }],
    },
    {
      title: "المراسلة",
      items: [
        { href: `/users/${userId}/individual`, label: "رسائل فردية", icon: MessageSquare },
        { href: `/users/${userId}/bulk`, label: "رسائل جماعية", icon: Users },
        { href: `/users/${userId}/free-messages`, label: "رسائل حرة", icon: MessageSquareText },
        { href: `/users/${userId}/appointments`, label: "تأكيد المواعيد", icon: CalendarCheck },
        { href: `/users/${userId}/inbox`, label: "صندوق الوارد", icon: Inbox },
        { href: `/users/${userId}/media`, label: "مكتبة الصور", icon: Images },
      ],
    },
    {
      title: "الحساب",
      items: [
        { href: `/users/${userId}/subscription`, label: "الاشتراك والفواتير", icon: CreditCard },
        { href: `/users/${userId}/settings`, label: "الإعدادات", icon: Settings },
      ],
    },
  ]

  const statusLabel = accountStatus === "active" ? "نشط" : accountStatus === "paused" ? "موقوف مؤقتاً" : "غير نشط"

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-300">
      {/* Logo Section */}
      <div className="px-5 h-20 flex items-center border-b border-white/5">
        <Link href="/users" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-white/95 p-1.5 shadow-lg shadow-emerald-500/20 ring-1 ring-white/10 group-hover:shadow-emerald-500/40 transition-shadow">
            <Image src="/logo.png" alt="o-wms Logo" width={40} height={40} className="object-contain w-full h-full" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold text-white tracking-wide">o-wms</span>
            <span className="text-[11px] text-emerald-400/80">نظام واتساب احترافي</span>
          </div>
        </Link>
      </div>

      {/* User Card */}
      <div className="px-4 pt-5">
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-900/40">
              {userName?.charAt(0) || "U"}
            </div>
            <span
              className={cn(
                "absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full ring-2 ring-slate-900",
                accountStatus === "active"
                  ? "bg-emerald-400"
                  : accountStatus === "paused"
                    ? "bg-amber-400"
                    : "bg-red-500",
              )}
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{userName}</p>
            {userPhone && (
              <p className="text-xs text-slate-400 truncate text-right" dir="ltr">
                {userPhone}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 px-1 text-[11px]">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              accountStatus === "active"
                ? "bg-emerald-500/10 text-emerald-300"
                : accountStatus === "paused"
                  ? "bg-amber-500/10 text-amber-300"
                  : "bg-red-500/10 text-red-300",
            )}
            aria-label={`حالة الحساب: ${statusLabel}`}
          >
            {statusLabel}
          </span>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-indigo-500/10 text-indigo-300">
              <ShieldCheck className="w-3 h-3" />
              مدير
            </span>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto [scrollbar-width:thin]">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => isMobile && setIsOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-l from-emerald-500/20 to-emerald-500/5 text-white ring-1 ring-emerald-400/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                    )}
                  >
                    {isActive && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-l-full bg-emerald-400 shadow-[0_0_12px] shadow-emerald-400/60" />
                    )}
                    <span
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                        isActive
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-900/50"
                          : "bg-white/5 text-slate-400 group-hover:text-emerald-300 group-hover:bg-white/10",
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <ChevronLeft
                      className={cn(
                        "w-4 h-4 transition-all",
                        isActive ? "text-emerald-300" : "opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0",
                      )}
                    />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5">
            <Home className="w-4 h-4" />
          </span>
          <span>الصفحة الرئيسية</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10">
            <LogOut className="w-4 h-4" />
          </span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-64 shadow-2xl shadow-slate-900/20 z-40 flex-col">
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
            <SheetContent side="right" className="w-72 p-0 border-0 bg-slate-900 [&>button]:text-white [&>button]:right-auto [&>button]:left-4 [&>button]:top-7">
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
