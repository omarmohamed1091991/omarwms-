"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, MessageSquare, Users, Inbox, Settings, Menu, X, UserCircle } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    title: "لوحة التحكم",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "رسائل فردية",
    href: "/dashboard/individual",
    icon: MessageSquare,
  },
  {
    title: "رسائل جماعية",
    href: "/dashboard/bulk",
    icon: Users,
  },
  {
    title: "صندوق الوارد",
    href: "/dashboard/inbox",
    icon: Inbox,
  },
  {
    title: "الملف الشخصي",
    href: "/dashboard/profile",
    icon: UserCircle,
  },
  {
    title: "الإعدادات",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed bottom-4 left-4 z-50 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg w-14 h-14"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}

      <nav
        className={cn(
          "bg-white border-l border-gray-200 min-h-[calc(100vh-73px)] p-4 transition-transform duration-300 ease-in-out",
          "lg:w-64 lg:static lg:translate-x-0",
          "fixed right-0 top-[73px] w-64 z-50",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-green-50 text-green-700" : "text-gray-700 hover:bg-gray-50",
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
