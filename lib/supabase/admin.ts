import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL_2
  const candidateKeys = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY_2,
    process.env.SUPABASE_SECRET_KEY,
  ]
  const supabaseServiceRoleKey = candidateKeys.find((key) => key && /^[\x00-\x7F]+$/.test(key))

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase server configuration is missing or invalid")
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
