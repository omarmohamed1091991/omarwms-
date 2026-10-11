import { NextResponse } from "next/server"
import { desc, eq, isNotNull, and } from "drizzle-orm"
import { db } from "@/db"
import { subscriptions } from "@/db/schema"
import { getSessionUser } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { CURRENCIES, getPlan, planPrice, siteOrigin, type Currency } from "@/lib/billing"
import { createPaymobCheckout } from "@/lib/paymob"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const currency = (body.currency in CURRENCIES ? body.currency : "egp") as Currency
  const plan = await getPlan(Number(body.planId))
  if (!plan || !plan.isActive) return NextResponse.json({ error: "الخطة غير متاحة" }, { status: 404 })
  if (!body.acceptedTerms) {
    return NextResponse.json({ error: "يجب الموافقة على الشروط وسياسة الاسترجاع" }, { status: 400 })
  }

  if (body.provider === "paymob") {
    try {
      const { url } = await createPaymobCheckout({ user, plan, currency, origin: siteOrigin(request) })
      return NextResponse.json({ url })
    } catch (error) {
      if (error instanceof Error && error.message === "MISSING_CONTACT") {
        return NextResponse.json({ error: "يرجى إضافة رقم الهاتف والبريد الإلكتروني في ملفك الشخصي قبل الدفع عبر Paymob" }, { status: 400 })
      }
      console.error("[checkout] Paymob session failed:", error instanceof Error ? error.message : error)
      return NextResponse.json({ error: "تعذر إنشاء جلسة الدفع عبر Paymob، يرجى المحاولة لاحقاً" }, { status: 500 })
    }
  }

  try {
    const stripe = getStripe()

    // إعادة استخدام عميل Stripe نفسه للمستخدم حتى تظهر كل الفواتير في مكان واحد.
    const [existing] = await db
      .select({ customerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, user.id), isNotNull(subscriptions.stripeCustomerId)))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)

    const metadata = { userId: user.id, planId: String(plan.id), planName: plan.name, type: "plan_subscription" }
    const origin = siteOrigin(request)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(existing?.customerId ? { customer: existing.customerId } : { customer_email: user.email || undefined }),
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: planPrice(plan, currency),
            recurring: { interval: plan.interval === "year" ? "year" : "month" },
            product_data: { name: `o-wms – ${plan.name}${plan.nameEn ? ` (${plan.nameEn})` : ""}` },
          },
        },
      ],
      metadata,
      subscription_data: { metadata },
      locale: "auto",
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/${plan.id}?cancelled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[checkout] Failed to create session:", error)
    return NextResponse.json({ error: "تعذر إنشاء جلسة الدفع، يرجى المحاولة لاحقاً" }, { status: 500 })
  }
}
