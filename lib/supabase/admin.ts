import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_URL_2 ||
    process.env.NEXT_PUBLIC_SUPABASE_URL_2
  )?.trim()
  const candidateKeys = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY_2,
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ]
  const supabaseKey = candidateKeys.find((key) => typeof key === "string" && key.trim().length > 0)?.trim()

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase server configuration is missing or invalid")
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
