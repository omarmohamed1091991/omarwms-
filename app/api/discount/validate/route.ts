import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { ENABLED_CURRENCIES, formatMoney, getPlan } from "@/lib/billing"
import { applyDiscount, validateDiscountCode } from "@/lib/discounts"

// معاينة كود الخصم في صفحة الدفع: يعيد نسبة الخصم والمبلغ النهائي لكل عملة.
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const plan = await getPlan(Number(body.planId))
  if (!plan || !plan.isActive) return NextResponse.json({ error: "الخطة غير متاحة" }, { status: 404 })

  const check = await validateDiscountCode(body.code).catch(() => ({ ok: false as const, error: "تعذر التحقق من الكود" }))
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const { code, percentOff } = check.discount
  const amounts = Object.fromEntries(
    ENABLED_CURRENCIES.map((c) => {
      const original = c === "egp" ? plan.priceEgpCents : plan.priceSarCents
      const { discountCents, finalCents } = applyDiscount(original, percentOff)
      return [c, { discount: formatMoney(discountCents, c), final: formatMoney(finalCents, c), free: finalCents === 0 }]
    }),
  )
  return NextResponse.json({ code, percentOff, amounts })
}
