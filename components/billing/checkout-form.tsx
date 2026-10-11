"use client"

import { useState } from "react"
import Link from "next/link"
import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

type Option = { code: "egp" | "sar"; label: string; amount: string }

export function CheckoutForm({ planId, options, period }: { planId: number; options: Option[]; period: string }) {
  const [currency, setCurrency] = useState<Option["code"]>("egp")
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selected = options.find((o) => o.code === currency)!

  async function pay() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, currency, acceptedTerms: accepted }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "تعذر بدء عملية الدفع")
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر بدء عملية الدفع")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-2">عملة الدفع</p>
        <div className="grid grid-cols-2 gap-3" role="radiogroup">
          {options.map((o) => (
            <button
              key={o.code}
              type="button"
              role="radio"
              aria-checked={currency === o.code}
              onClick={() => setCurrency(o.code)}
              className={`rounded-xl border p-4 text-right transition-all ${
                currency === o.code ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20" : "border-gray-200 hover:border-emerald-200"
              }`}
            >
              <p className="text-xs text-gray-500">{o.label}</p>
              <p className="text-lg font-bold text-gray-900">{o.amount}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">المبلغ المستحق اليوم</span>
          <span className="font-bold text-gray-900">{selected.amount}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>التجديد التلقائي</span>
          <span>
            {selected.amount} {period}
          </span>
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
        <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
        <span>
          أوافق على <Link href="/terms" target="_blank" className="text-emerald-700 underline">الشروط والأحكام</Link> و
          <Link href="/refund-policy" target="_blank" className="text-emerald-700 underline">سياسة الاسترجاع والإلغاء</Link>،
          وأفهم أن الاشتراك يتجدد تلقائياً {period} حتى أقوم بإلغائه.
        </span>
      </label>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

      <button
        type="button"
        onClick={pay}
        disabled={!accepted || loading}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {loading ? "جاري التحويل إلى بوابة الدفع..." : `ادفع ${selected.amount}`}
      </button>

      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" /> دفع آمن ومشفر
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> لا نحتفظ ببيانات بطاقتك
        </span>
      </div>
    </div>
  )
}
