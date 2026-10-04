import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  const body = await request.text()
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Webhook is not configured", { status: 400 })
  }

  const stripe = getStripe()
  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return new NextResponse("Invalid signature", { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const userId = session.metadata?.userId
    if (userId && session.payment_status === "paid") {
      const admin = createAdminClient()
      const { data: profile } = await admin
        .from("user_profiles")
        .select("subscription_expires_at")
        .eq("id", userId)
        .single()
      const currentExpiry = profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date()
        ? new Date(profile.subscription_expires_at)
        : new Date()
      currentExpiry.setMonth(currentExpiry.getMonth() + 1)
      await admin.from("user_profiles").update({
        subscription_expires_at: currentExpiry.toISOString(),
        account_status: "active",
        is_active: true,
      }).eq("id", userId)
    }
  }

  return NextResponse.json({ received: true })
}
