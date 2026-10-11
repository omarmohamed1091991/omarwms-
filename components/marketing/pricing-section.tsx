import Link from "next/link"
import { Check } from "lucide-react"
import { pricingPlans, formatPrice } from "@/lib/site-config"

export function PricingSection() {
  return (
    <section id="pricing" className="container mx-auto px-6 max-w-6xl py-16 scroll-mt-24">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">باقات الأسعار</h2>
        <p className="text-sm text-gray-600">
          جميع الأسعار بالجنيه المصري (ج.م) مع ما يعادلها بالريال السعودي (ر.س). الأسعار شاملة وتُدفع شهرياً.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricingPlans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col bg-white rounded-2xl p-6 border shadow-sm ${
              plan.featured ? "border-emerald-500 ring-2 ring-emerald-500/20 md:-translate-y-2" : "border-gray-100"
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-3 right-6 bg-emerald-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                الأكثر طلباً
              </span>
            )}
            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            <p className="text-xs text-gray-400 mb-2" dir="ltr">
              {plan.nameEn}
            </p>
            <p className="text-sm text-gray-600 mb-5 min-h-10">{plan.description}</p>

            <div className="mb-1">
              <span className="text-3xl font-extrabold text-gray-900">{formatPrice(plan.priceEgp)}</span>
              <span className="text-sm text-gray-600 mr-1">ج.م / EGP</span>
              <span className="text-xs text-gray-500"> {plan.period}</span>
            </div>
            <p className="text-sm text-emerald-700 font-medium mb-6">
              ≈ {formatPrice(plan.priceSar)} ر.س / SAR {plan.period}
            </p>

            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={`/auth/signup?plan=${plan.id}`}
              className={`text-center text-sm font-medium h-11 leading-[2.75rem] rounded-lg transition-all ${
                plan.featured
                  ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                  : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              اشترك الآن
            </Link>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
        يتم تفعيل الاشتراك رقمياً خلال 24 ساعة كحد أقصى بعد تأكيد الدفع. يمكنك الإلغاء في أي وقت وفق{" "}
        <Link href="/refund-policy" className="text-emerald-700 underline">
          سياسة الاسترجاع والإلغاء
        </Link>{" "}
        و
        <Link href="/terms" className="text-emerald-700 underline">
          الشروط والأحكام
        </Link>
        . لخدمات التسويق الرقمي وتطوير المواقع المخصصة،{" "}
        <Link href="/contact" className="text-emerald-700 underline">
          تواصل معنا
        </Link>{" "}
        للحصول على عرض سعر.
      </p>
    </section>
  )
}
