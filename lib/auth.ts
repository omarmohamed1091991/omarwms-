import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type SessionUser = { id: string; email: string | null; role: "admin" | "user"; fullName: string | null }

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await createAdminClient()
      .from("user_profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .single()
    return {
      id: user.id,
      email: profile?.email || user.email || null,
      role: profile?.role === "admin" ? "admin" : "user",
      fullName: profile?.full_name || null,
    }
  } catch {
    return null
  }
}

export async function requireAdmin() {
  const user = await getSessionUser()
  if (!user || user.role !== "admin") throw new Error("غير مصرح: هذه العملية متاحة للأدمن فقط")
  return user
}
