import Link from "next/link"
import { Check } from "lucide-react"
import type { PricingPlan } from "@/db/schema"
import { INTERVALS, formatMoney, type Interval } from "@/lib/billing"

export function PlanCard({
  plan,
  isCurrent = false,
  ctaLabel = "اشترك الآن",
}: {
  plan: PricingPlan
  isCurrent?: boolean
  ctaLabel?: string
}) {
  const period = INTERVALS[plan.interval as Interval]?.label ?? "شهرياً"
  return (
    <div
      className={`relative flex flex-col bg-white rounded-2xl p-6 border shadow-sm ${
        plan.isFeatured ? "border-emerald-500 ring-2 ring-emerald-500/20 md:-translate-y-2" : "border-gray-100"
      }`}
    >
      {plan.isFeatured && (
        <span className="absolute -top-3 right-6 bg-emerald-600 text-white text-xs font-medium px-3 py-1 rounded-full">
          الأكثر طلباً
        </span>
      )}
      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
      {plan.nameEn && (
        <p className="text-xs text-gray-400 mb-2" dir="ltr">
          {plan.nameEn}
        </p>
      )}
      <p className="text-sm text-gray-600 mb-5 min-h-10">{plan.description}</p>

      <div className="mb-1">
        <span className="text-3xl font-extrabold text-gray-900">{formatMoney(plan.priceEgpCents, "egp")}</span>
        <span className="text-xs text-gray-500"> / EGP {period}</span>
      </div>
      <p className="text-sm text-emerald-700 font-medium mb-6">
        ≈ {formatMoney(plan.priceSarCents, "sar")} / SAR {period}
      </p>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
            <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <span className="text-center text-sm font-medium h-11 leading-[2.75rem] rounded-lg bg-gray-100 text-gray-500">
          خطتك الحالية
        </span>
      ) : (
        <Link
          href={`/checkout/${plan.id}`}
          className={`text-center text-sm font-medium h-11 leading-[2.75rem] rounded-lg transition-all ${
            plan.isFeatured
              ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
              : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}
