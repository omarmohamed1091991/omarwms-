"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Home, LayoutDashboard, LogOut, Menu, ShieldCheck, UserPlus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { ADMIN_SECTIONS, type AdminSection } from "@/components/admin/sections"

type Props = {
  active: AdminSection
  counts: Partial<Record<AdminSection, number>>
  adminName: string
  adminEmail: string | null
  adminId: string | null
}

export function AdminSidebar(props: Props) {
  const [open, setOpen] = useState(false)
  const current = ADMIN_SECTIONS.find((s) => s.key === props.active)

  return (
    <>
      {/* سطح المكتب */}
      <aside className="hidden lg:flex w-72 shrink-0 sticky top-0 h-screen">
        <SidebarBody {...props} />
      </aside>

      {/* الجوال */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 bg-slate-900 px-4 h-16 text-white">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button type="button" aria-label="فتح القائمة" className="p-2 -m-2 rounded-lg hover:bg-white/10">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-72 border-0 bg-slate-900">
            <SheetHeader className="sr-only">
              <SheetTitle>مركز التحكم</SheetTitle>
            </SheetHeader>
            <SidebarBody {...props} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">مركز التحكم</p>
          {current && <p className="text-[11px] text-slate-400 truncate">{current.label}</p>}
        </div>
        <LanguageSwitcher variant="dark" />
      </div>
    </>
  )
}

function SidebarBody({ active, counts, adminName, adminEmail, adminId, onNavigate }: Props & { onNavigate?: () => void }) {
  const router = useRouter()
  const logout = async () => {
    await createClient().auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex flex-col w-full h-full bg-slate-900 text-slate-300">
      <div className="px-5 h-20 flex items-center gap-3 border-b border-white/5">
        <div className="w-11 h-11 rounded-xl bg-white p-1.5 shadow-lg shadow-emerald-500/20">
          <Image src="/logo.png" alt="o-wms" width={40} height={40} className="w-full h-full object-contain" />
        </div>
        <div className="leading-tight">
          <p className="text-base font-bold text-white">مركز التحكم</p>
          <p className="text-[11px] text-emerald-400/80">إدارة نظام o-wms</p>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{adminName}</p>
            {adminEmail ? (
              <p className="text-xs text-slate-400 truncate" dir="ltr">
                {adminEmail}
              </p>
            ) : (
              <p className="text-xs text-slate-400">مدير النظام</p>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-500">الإدارة</p>
        <div className="space-y-1">
          {ADMIN_SECTIONS.map(({ key, label, hint, icon: Icon }) => {
            const isActive = key === active
            const count = counts[key]
            return (
              <Link
                key={key}
                href={key === "users" ? "/users" : `/users?section=${key}`}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                  isActive ? "bg-emerald-500/15 text-white ring-1 ring-emerald-400/25" : "text-slate-400 hover:text-white hover:bg-white/5",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors",
                    isActive ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-400 group-hover:text-emerald-300",
                  )}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{label}</span>
                  <span className={cn("block text-[11px] truncate", isActive ? "text-emerald-200/70" : "text-slate-500")}>{hint}</span>
                </span>
                {typeof count === "number" && (
                  <span
                    className={cn(
                      "text-[11px] tabular-nums rounded-full px-2 py-0.5",
                      isActive ? "bg-emerald-400/20 text-emerald-100" : "bg-white/5 text-slate-400",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <p className="px-3 mt-7 mb-2 text-[11px] font-semibold tracking-wider text-slate-500">روابط سريعة</p>
        <div className="space-y-1">
          <QuickLink href="/users/new" icon={UserPlus} label="إضافة مستخدم جديد" onNavigate={onNavigate} />
          {adminId && <QuickLink href={`/users/${adminId}`} icon={LayoutDashboard} label="لوحتي الشخصية" onNavigate={onNavigate} />}
          <QuickLink href="/" icon={Home} label="الصفحة الرئيسية" onNavigate={onNavigate} />
        </div>
      </nav>

      <div className="p-3 border-t border-white/5 flex items-center gap-2">
        <button
          type="button"
          onClick={logout}
          className="flex-1 flex items-center gap-2 px-3 h-9 rounded-lg text-sm text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
        <LanguageSwitcher variant="dark" className="hidden lg:inline-flex" />
      </div>
    </div>
  )
}

function QuickLink({ href, icon: Icon, label, onNavigate }: { href: string; icon: LucideIcon; label: string; onNavigate?: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5">
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  )
}
