import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { UserSidebar } from "@/components/users/user-sidebar"
import { UserTopNav } from "@/components/users/user-top-nav"
import { getLinkedWhatsAppPhone } from "@/lib/linked-whatsapp-phone"

export const revalidate = 0

export default async function UserLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = createAdminClient()

  const { data: user, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single()

  if (error || !user) {
    redirect("/users")
  }

  // رقم واتساب المربوط في الإعدادات (وليس رقم هاتف المستخدم)
  const whatsappPhone = await getLinkedWhatsAppPhone(user)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <UserSidebar
        userId={userId}
        userName={user.full_name || user.phone_number}
        userPhone={whatsappPhone || undefined}
        accountStatus={user.account_status === "active" && user.account_active_until && new Date(user.account_active_until) < new Date() ? "suspended" : user.account_status || (user.is_active ? "active" : "suspended")}
        isAdmin={user.role === "admin"}
      />

      {/* Main Content - يبدأ مباشرة بعد الـ sidebar */}
      <main className="lg:mr-64 min-h-screen">
        <UserTopNav />
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
