"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const ACTIVITY_THROTTLE_MS = 30 * 1000

export function IdleSessionTimeout() {
  const pathname = usePathname()
  const router = useRouter()
  const lastActivityRef = useRef(Date.now())
  const lastActivityWriteRef = useRef(0)
  const isSigningOutRef = useRef(false)

  useEffect(() => {
    if (pathname.startsWith("/auth/")) return

    const recordActivity = () => {
      const now = Date.now()
      if (now - lastActivityWriteRef.current >= ACTIVITY_THROTTLE_MS) {
        lastActivityRef.current = now
        lastActivityWriteRef.current = now
      }
    }

    const signOutForInactivity = async () => {
      if (isSigningOutRef.current) return
      isSigningOutRef.current = true
      await createClient().auth.signOut()
      router.replace("/auth/login?reason=idle")
      router.refresh()
    }

    const activityEvents = ["mousedown", "keydown", "pointermove", "scroll", "touchstart"] as const
    activityEvents.forEach((eventName) => window.addEventListener(eventName, recordActivity, { passive: true }))

    const intervalId = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        void signOutForInactivity()
      }
    }, 60 * 1000)

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity))
      window.clearInterval(intervalId)
    }
  }, [pathname, router])

  return null
}

export default IdleSessionTimeout
