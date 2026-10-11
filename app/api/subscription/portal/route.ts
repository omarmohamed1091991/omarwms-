import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { getUserSubscription, siteOrigin } from "@/lib/billing"

// بوابة Stripe لتحديث وسيلة الدفع وتحميل الفواتير.
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  const sub = await getUserSubscription(user.id)
  if (!sub?.stripeCustomerId) return NextResponse.json({ error: "لا يوجد حساب فوترة بعد" }, { status: 404 })

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${siteOrigin(request)}/users/${user.id}/subscription`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[subscription] portal failed:", error)
    return NextResponse.json({ error: "بوابة الفوترة غير مفعلة حالياً، تواصل مع الدعم" }, { status: 500 })
  }
}
