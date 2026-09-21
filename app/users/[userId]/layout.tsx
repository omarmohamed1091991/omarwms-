import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { UserSidebar } from "@/components/users/user-sidebar"

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-blue-50/50">
      {/* Sidebar */}
      <UserSidebar userId={userId} userName={user.full_name || user.phone_number} userPhone={user.phone_number} />

      {/* Main Content - يبدأ مباشرة بعد الـ sidebar */}
      <main className="lg:mr-64 min-h-screen">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
