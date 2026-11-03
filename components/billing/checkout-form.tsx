"use client"

import { useState } from "react"
import Link from "next/link"
import { CreditCard, Loader2, Lock, ShieldCheck, Tag, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

type Option = { code: "egp" | "sar"; label: string; amount: string; paymob: boolean }
type Discount = {
  code: string
  percentOff: number
  amounts: Record<Option["code"], { discount: string; final: string; free: boolean }>
}

export function CheckoutForm({ planId, options, period }: { planId: number; options: Option[]; period: string }) {
  const available = options.filter((o) => o.paymob)
  const [currency, setCurrency] = useState<Option["code"]>(() => available[0]?.code ?? "egp")
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selected = options.find((o) => o.code === currency)!

  // كود الخصم (اختياري)
  const [codeInput, setCodeInput] = useState("")
  const [checking, setChecking] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [discount, setDiscount] = useState<Discount | null>(null)
  const applied = discount?.amounts[currency]
  const finalAmount = applied ? applied.final : selected.amount

  async function applyCode() {
    if (!codeInput.trim()) return
    setChecking(true)
    setCodeError(null)
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, code: codeInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "كود الخصم غير صالح")
      setDiscount(data)
    } catch (e) {
      setDiscount(null)
      setCodeError(e instanceof Error ? e.message : "كود الخصم غير صالح")
    } finally {
      setChecking(false)
    }
  }

  function removeCode() {
    setDiscount(null)
    setCodeInput("")
    setCodeError(null)
  }

  async function pay() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, currency, acceptedTerms: accepted, discountCode: discount?.code }),
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
              disabled={!o.paymob}
              onClick={() => setCurrency(o.code)}
              className={`rounded-xl border p-4 text-right transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                currency === o.code ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20" : "border-gray-200 hover:border-emerald-200"
              }`}
            >
              <p className="text-xs text-gray-500">{o.label}</p>
              <p className="text-lg font-bold text-gray-900">{o.amount}</p>
              {!o.paymob && <p className="text-xs text-gray-400">غير متاح حالياً</p>}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-900 mb-2">
          كود الخصم <span className="font-normal text-gray-400">(اختياري)</span>
        </p>
        {discount ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-emerald-800">
              <Tag className="w-4 h-4" />
              <span className="font-mono font-bold" dir="ltr">
                {discount.code}
              </span>
              · خصم {discount.percentOff}%
            </span>
            <button type="button" onClick={removeCode} className="text-gray-500 hover:text-red-600" aria-label="إزالة كود الخصم">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase())
                setCodeError(null)
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCode())}
              placeholder="أدخل كود الخصم"
              dir="ltr"
              className="flex-1 h-11 rounded-xl border border-gray-200 px-4 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={applyCode}
              disabled={!codeInput.trim() || checking}
              className="h-11 px-5 rounded-xl border border-emerald-600 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-1.5"
            >
              {checking && <Loader2 className="w-4 h-4 animate-spin" />}
              تطبيق
            </button>
          </div>
        )}
        {codeError && <p className="mt-2 text-xs text-red-600">{codeError}</p>}
      </div>

      <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
        {applied && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">سعر الخطة</span>
              <span className="text-gray-500 line-through">{selected.amount}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>الخصم ({discount!.percentOff}%)</span>
              <span>- {applied.discount}</span>
            </div>
          </>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">المبلغ المستحق اليوم</span>
          <span className="font-bold text-gray-900">{finalAmount}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>التجديد</span>
          <span>يدوي – لا يتم أي خصم تلقائي</span>
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
        <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
        <span>
          أوافق على <Link href="/terms" target="_blank" className="text-emerald-700 underline">الشروط والأحكام</Link> و
          <Link href="/refund-policy" target="_blank" className="text-emerald-700 underline">سياسة الاسترجاع والإلغاء</Link>،
          وأفهم أن هذه دفعة واحدة لفترة اشتراك واحدة ({period})، ويتم التجديد يدوياً.
        </span>
      </label>

      {available.length === 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">الدفع الإلكتروني غير متاح حالياً، يرجى المحاولة لاحقاً.</p>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

      <button
        type="button"
        onClick={pay}
        disabled={!accepted || loading || !selected.paymob}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {loading
          ? applied?.free
            ? "جاري تفعيل الاشتراك..."
            : "جاري التحويل إلى بوابة الدفع..."
          : applied?.free
            ? "تفعيل الاشتراك مجاناً"
            : `ادفع ${finalAmount}`}
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
