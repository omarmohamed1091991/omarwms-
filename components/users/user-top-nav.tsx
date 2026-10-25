"use client"

import Link from "next/link"
import { ChevronDown, Home, Tag, Info, Phone, ShieldCheck } from "lucide-react"
import { mainNav, legalNav } from "@/lib/site-config"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const icons: Record<string, typeof Home> = {
  "/": Home,
  "/#pricing": Tag,
  "/about": Info,
  "/contact": Phone,
}

const linkClass =
  "flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"

export function UserTopNav() {
  return (
    <div className="sticky top-16 lg:top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-200/80">
      <nav
        aria-label="روابط الموقع"
        className="flex items-center gap-1 px-4 lg:px-6 h-12 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {mainNav.map((item) => {
          const Icon = icons[item.href] ?? Home
          return (
            <Link key={item.href} href={item.href} className={linkClass}>
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger className={`${linkClass} outline-none data-[state=open]:bg-emerald-50 data-[state=open]:text-emerald-700`}>
            <ShieldCheck className="w-4 h-4" />
            السياسات
            <ChevronDown className="w-3.5 h-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {legalNav.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="cursor-pointer">
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  )
}
