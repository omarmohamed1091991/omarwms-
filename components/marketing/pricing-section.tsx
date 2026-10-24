import Link from "next/link"
import { listPlans } from "@/lib/billing"
import { PlanCard } from "@/components/billing/plan-card"

export async function PricingSection() {
  const plans = await listPlans({ activeOnly: true })

  return (
    <section id="pricing" className="container mx-auto px-6 max-w-6xl py-16 scroll-mt-24">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">باقات الأسعار</h2>
        <p className="text-sm text-gray-600">
          جميع الأسعار بالجنيه المصري (ج.م) مع ما يعادلها بالريال السعودي (ر.س). الأسعار شاملة ويتجدد الاشتراك تلقائياً
          ويمكن إلغاؤه في أي وقت.
        </p>
      </div>

      {plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-8">
          يتم تحديث الباقات حالياً.{" "}
          <Link href="/contact" className="text-emerald-700 underline">
            تواصل معنا
          </Link>{" "}
          للاطلاع على الأسعار.
        </p>
      )}

      <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
        يتم تفعيل الاشتراك رقمياً فور تأكيد الدفع (24 ساعة كحد أقصى). الدفع لكل فترة على حدة ولا يتم أي خصم تلقائي، وفق{" "}
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
