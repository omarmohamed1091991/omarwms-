import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, BadgeCheck } from "lucide-react"
import { InvoiceDownloadButton } from "@/components/billing/invoice-download-button"
import { getSessionUser } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { siteConfig } from "@/lib/site-config"
import { CURRENCIES, INTERVALS, formatMoney, getPaymentWithOrder, invoiceNumber, orderNumber, type Currency, type Interval } from "@/lib/billing"

export const dynamic = "force-dynamic"

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string; paymentId: string }>
  searchParams: Promise<{ download?: string }>
}) {
  const { userId, paymentId } = await params
  const { download } = await searchParams
  const [viewer, payment] = await Promise.all([getSessionUser(), getPaymentWithOrder(Number(paymentId)).catch(() => null)])
  if (!viewer || (viewer.id !== userId && viewer.role !== "admin")) notFound()
  if (!payment || payment.userId !== userId) notFound()

  const { data: customer } = await createAdminClient()
    .from("user_profiles")
    .select("full_name, email, phone_number")
    .eq("id", userId)
    .single()

  const number = invoiceNumber(payment)
  const order = orderNumber(payment)
  const currency = CURRENCIES[payment.currency as Currency]
  const period = INTERVALS[(payment.interval ?? "month") as Interval]?.noun ?? "شهر"
  const paidAt = payment.paidAt
  const dateFmt = (d: Date) => d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/users/${userId}/subscription`} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-700">
          <ArrowRight className="w-4 h-4" />
          العودة إلى الاشتراك والفواتير
        </Link>
        <InvoiceDownloadButton targetId="invoice" fileName={number} autoDownload={download === "1"} />
      </div>

      <div id="invoice" dir="rtl" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800 print:shadow-none print:border-0">
        <div className="bg-slate-900 text-white px-8 py-7 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white p-1.5">
              <Image src="/logo.png" alt={siteConfig.name} width={56} height={56} className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-xl font-bold">{siteConfig.legalName}</p>
              <p className="text-xs text-slate-300 mt-0.5">{siteConfig.url.replace("https://", "")}</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold tracking-wide">فاتورة</p>
            <p className="text-xs text-slate-300 mt-1" dir="ltr">
              INVOICE
            </p>
          </div>
        </div>

        <div className="px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50/60">
          <Meta label="رقم الفاتورة" value={number} mono />
          <Meta label="رقم الطلب" value={order} mono />
          <Meta label="تاريخ الإصدار" value={dateFmt(paidAt)} />
        </div>

        <div className="px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-2">صادرة من</p>
            <p className="font-bold">{siteConfig.legalName}</p>
            <p className="text-sm text-slate-600">{siteConfig.address.ar}</p>
            <p className="text-sm text-slate-600" dir="ltr">
              {siteConfig.email}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-2">صادرة إلى</p>
            <p className="font-bold">{customer?.full_name || "—"}</p>
            {customer?.email && (
              <p className="text-sm text-slate-600" dir="ltr">
                {customer.email}
              </p>
            )}
            {customer?.phone_number && (
              <p className="text-sm text-slate-600" dir="ltr">
                {customer.phone_number}
              </p>
            )}
          </div>
        </div>

        <div className="px-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 text-emerald-900">
                <th className="text-right font-semibold py-3 px-4 rounded-r-lg">الوصف</th>
                <th className="text-right font-semibold py-3 px-4">المدة</th>
                <th className="text-right font-semibold py-3 px-4">الكمية</th>
                <th className="text-left font-semibold py-3 px-4 rounded-l-lg">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-4 px-4">
                  <p className="font-semibold">اشتراك خطة {payment.planName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">اشتراك في منصة {siteConfig.name} لإدارة رسائل واتساب</p>
                </td>
                <td className="py-4 px-4">{period} واحد</td>
                <td className="py-4 px-4">1</td>
                <td className="py-4 px-4 text-left font-semibold">{formatMoney(payment.amountCents, payment.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-8 py-6 flex flex-col sm:flex-row justify-between gap-6">
          <div className="space-y-1.5 text-sm">
            <p className="text-xs font-semibold text-emerald-700 mb-2">تفاصيل الدفع</p>
            <p>
              <span className="text-slate-500">وسيلة الدفع: </span>
              {payment.provider === "paymob" ? "Paymob – بطاقة بنكية" : "Stripe"}
            </p>
            {payment.paymobTransactionId && (
              <p>
                <span className="text-slate-500">رقم العملية: </span>
                <span className="font-mono">{payment.paymobTransactionId}</span>
              </p>
            )}
            {payment.reference && (
              <p>
                <span className="text-slate-500">المرجع: </span>
                <span className="font-mono text-xs">{payment.reference}</span>
              </p>
            )}
            <p>
              <span className="text-slate-500">تاريخ الدفع: </span>
              {dateFmt(paidAt)}
            </p>
          </div>
          <div className="sm:w-72 rounded-xl border border-slate-200 overflow-hidden text-sm">
            <Row label="المجموع الفرعي" value={formatMoney(payment.amountCents, payment.currency)} />
            <Row label="الخصم" value={formatMoney(0, payment.currency)} />
            <div className="flex justify-between items-center px-4 py-3 bg-slate-900 text-white">
              <span className="font-semibold">الإجمالي ({currency?.short ?? payment.currency.toUpperCase()})</span>
              <span className="text-lg font-bold">{formatMoney(payment.amountCents, payment.currency)}</span>
            </div>
          </div>
        </div>

        <div className="mx-8 mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 text-sm">
          <BadgeCheck className="w-5 h-5 shrink-0" />
          {payment.status === "paid" ? "تم سداد هذه الفاتورة بالكامل. شكراً لاشتراكك!" : `حالة الدفع: ${payment.status}`}
        </div>

        <div className="px-8 py-4 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap justify-between gap-2">
          <span>هذه فاتورة إلكترونية صادرة آلياً ولا تحتاج إلى توقيع.</span>
          <span dir="ltr">
            {siteConfig.phones.egypt.display} · {siteConfig.phones.ksa.display}
          </span>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-bold mt-0.5 ${mono ? "font-mono text-sm break-all text-right" : ""}`} dir={mono ? "ltr" : undefined}>
        {value}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-2.5 border-b border-slate-100">
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
    </div>
  )
}
