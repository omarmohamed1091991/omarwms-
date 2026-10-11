import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { getUserSubscription, syncStripeSubscription } from "@/lib/billing"

// تفعيل أو إيقاف التجديد التلقائي للاشتراك الحالي.
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 })

  const { action, userId } = await request.json().catch(() => ({}))
  const targetUserId = user.role === "admin" && userId ? String(userId) : user.id
  const sub = await getUserSubscription(targetUserId)
  if (!sub?.stripeSubscriptionId) return NextResponse.json({ error: "لا يوجد اشتراك فعال" }, { status: 404 })
  if (action !== "cancel" && action !== "resume") return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 })

  try {
    const updated = await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: action === "cancel",
    })
    await syncStripeSubscription(updated)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[subscription] manage failed:", error)
    return NextResponse.json({ error: "تعذر تحديث الاشتراك" }, { status: 500 })
  }
}
