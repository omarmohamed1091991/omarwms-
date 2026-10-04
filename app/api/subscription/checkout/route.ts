import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe } from "@/lib/stripe"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from("user_profiles")
    .select("id, email, full_name, subscription_price_cents, subscription_expires_at")
    .eq("id", user.id)
    .single()

  if (error || !profile || profile.subscription_price_cents <= 0) {
    return NextResponse.json({ error: "لم يتم تحديد سعر الاشتراك لهذا الحساب" }, { status: 400 })
  }

  const stripe = getStripe()
  const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000").origin
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: profile.email || user.email,
    line_items: [{
      price_data: {
        currency: "sar",
        product_data: { name: "تجديد الاشتراك الشهري" },
        unit_amount: profile.subscription_price_cents,
      },
      quantity: 1,
    }],
    metadata: { userId: profile.id, type: "monthly_subscription" },
    success_url: `${origin}/dashboard?subscription=success`,
    cancel_url: `${origin}/dashboard?subscription=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
