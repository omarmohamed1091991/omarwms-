import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[v0] Missing Supabase environment variables")
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicPaths = ["/", "/auth/login"]
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname === path)

  if (isPublicPath) {
    return supabaseResponse
  }

  if (request.nextUrl.pathname === "/users" || request.nextUrl.pathname.startsWith("/users/new")) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = `/users/${user.id}`
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  if (request.nextUrl.pathname.startsWith("/users/") && !request.nextUrl.pathname.includes("/new")) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    const pathParts = request.nextUrl.pathname.split("/")
    const userIdFromPath = pathParts[2]

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role === "admin") {
      return supabaseResponse
    }

    if (userIdFromPath !== user.id) {
      const url = request.nextUrl.clone()
      url.pathname = `/users/${user.id}`
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  return supabaseResponse
}
