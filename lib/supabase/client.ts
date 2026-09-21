import { createBrowserClient } from "@supabase/ssr"

export function createClient(config?: { supabaseUrl?: string; supabaseKey?: string }) {
  const supabaseUrl =
    config?.supabaseUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL_2 ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_URL_2
  const supabaseKey =
    config?.supabaseKey ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables. Check your project settings.")
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
