import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  // Temporary maintenance mode: skip authentication and open the dashboard directly.
  if (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/auth/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/users"
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
