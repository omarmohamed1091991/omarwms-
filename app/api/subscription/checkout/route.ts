import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { CURRENCIES, getPlan, isCurrencyEnabled, siteOrigin, type Currency } from "@/lib/billing"
import { createPaymobCheckout } from "@/lib/paymob"
import { normalizeCode, validateDiscountCode } from "@/lib/discounts"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const currency = (body.currency in CURRENCIES ? body.currency : "egp") as Currency
  if (!isCurrencyEnabled(currency)) {
    return NextResponse.json({ error: `الدفع بـ${CURRENCIES[currency].label} غير متاح حالياً` }, { status: 400 })
  }
  const plan = await getPlan(Number(body.planId))
  if (!plan || !plan.isActive) return NextResponse.json({ error: "الخطة غير متاحة" }, { status: 404 })
  if (!body.acceptedTerms) {
    return NextResponse.json({ error: "يجب الموافقة على الشروط وسياسة الاسترجاع" }, { status: 400 })
  }

  // كود الخصم اختياري؛ إذا أُرسل يجب أن يكون صالحاً وإلا نوقف العملية حتى لا يدفع المستخدم المبلغ كاملاً دون علمه.
  let discount = null
  if (normalizeCode(body.discountCode)) {
    const check = await validateDiscountCode(body.discountCode)
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
    discount = check.discount
  }

  try {
    const { url } = await createPaymobCheckout({ user, plan, currency, origin: siteOrigin(request), discount })
    return NextResponse.json({ url })
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_CONTACT") {
      return NextResponse.json({ error: "يرجى إضافة رقم الهاتف والبريد الإلكتروني في ملفك الشخصي قبل الدفع" }, { status: 400 })
    }
    if (error instanceof Error && /not configured/.test(error.message)) {
      return NextResponse.json({ error: `الدفع بـ${CURRENCIES[currency].label} غير متاح حالياً` }, { status: 400 })
    }
    console.error("[checkout] Paymob session failed:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "تعذر إنشاء جلسة الدفع، يرجى المحاولة لاحقاً" }, { status: 500 })
  }
}
