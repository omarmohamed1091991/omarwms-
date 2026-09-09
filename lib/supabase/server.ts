import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "./admin"

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://nrwsnxxzjczsrzwvkawa.supabase.co"
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd3NueHh6amN6c3J6d3ZrYXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMjE0NjUsImV4cCI6MjA1MjU5NzQ2NX0.qY8xPOUbDn-Jp2qCnCUfYPqGJ_pGJBkTHxBUqv0tOkU"

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

export async function getAllUsers() {
  const adminClient = createAdminClient()

  const { data: users, error } = await adminClient
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching users with admin client:", error)
    return []
  }

  return users || []
}
