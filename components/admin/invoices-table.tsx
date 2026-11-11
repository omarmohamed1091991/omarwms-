"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Download, Eye, Receipt, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type AdminInvoice = {
  id: number
  number: string
  order: string
  userId: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  planName: string
  intervalLabel: string
  amount: string
  originalAmount: string | null
  discountCode: string | null
  discountPercent: number | null
  currency: string
  status: string
  provider: string
  paidAt: string
}

const STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "مدفوعة", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  failed: { label: "فشل الدفع", className: "bg-red-50 text-red-700 ring-red-200" },
  refunded: { label: "مستردة", className: "bg-amber-50 text-amber-700 ring-amber-200" },
}

const PAGE = 25

export function InvoicesTable({ invoices }: { invoices: AdminInvoice[] }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [currency, setCurrency] = useState("all")
  const [shown, setShown] = useState(PAGE)

  const currencies = useMemo(() => [...new Set(invoices.map((i) => i.currency))], [invoices])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices.filter((i) => {
      if (status !== "all" && i.status !== status) return false
      if (currency !== "all" && i.currency !== currency) return false
      if (!q) return true
      return [i.number, i.order, i.customerName, i.customerEmail, i.customerPhone, i.planName, i.discountCode]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [invoices, query, status, currency])

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShown(PAGE)
            }}
            placeholder="ابحث برقم الفاتورة أو اسم العميل أو البريد أو الهاتف..."
            className="ps-9 h-10 rounded-xl bg-white"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setShown(PAGE)
          }}
        >
          <SelectTrigger className="h-10 rounded-xl md:w-44 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currencies.length > 1 && (
          <Select
            value={currency}
            onValueChange={(v) => {
              setCurrency(v)
              setShown(PAGE)
            }}
          >
            <SelectTrigger className="h-10 rounded-xl md:w-40 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل العملات</SelectItem>
              {currencies.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-white ring-1 ring-slate-200 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">{invoices.length === 0 ? "لا توجد فواتير حتى الآن" : "لا توجد نتائج مطابقة"}</p>
          <p className="text-sm text-slate-500 mt-1">
            {invoices.length === 0 ? "ستظهر هنا فواتير العملاء تلقائياً بعد كل عملية دفع ناجحة." : "جرّب تغيير كلمات البحث أو عوامل التصفية."}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-slate-50">
                  <TableHead className="text-start">رقم الفاتورة</TableHead>
                  <TableHead className="text-start">العميل</TableHead>
                  <TableHead className="text-start">الخطة</TableHead>
                  <TableHead className="text-start">المبلغ</TableHead>
                  <TableHead className="text-start">التاريخ</TableHead>
                  <TableHead className="text-start">الحالة</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, shown).map((i) => {
                  const st = STATUS[i.status] ?? { label: i.status, className: "bg-slate-50 text-slate-600 ring-slate-200" }
                  const href = `/users/${i.userId}/subscription/invoices/${i.id}`
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <p className="font-mono text-xs font-semibold text-slate-800" dir="ltr">
                          {i.number}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400 mt-0.5" dir="ltr">
                          {i.order}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Link href={`/users/${i.userId}`} className="font-medium text-slate-800 hover:text-emerald-700">
                          {i.customerName}
                        </Link>
                        {(i.customerEmail || i.customerPhone) && (
                          <p className="text-[11px] text-slate-500 mt-0.5" dir="ltr">
                            {i.customerEmail || i.customerPhone}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-800">{i.planName}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{i.intervalLabel}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-slate-900 tabular-nums">{i.amount}</p>
                        {i.discountCode && (
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            <span dir="ltr" className="font-mono">
                              {i.discountCode}
                            </span>{" "}
                            (-{i.discountPercent}%)
                            {i.originalAmount && <span className="text-slate-400 line-through ms-1">{i.originalAmount}</span>}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">{dateFmt(i.paidAt)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ${st.className}`}>{st.label}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={href}
                            title="عرض الفاتورة"
                            aria-label="عرض الفاتورة"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`${href}?download=1`}
                            title="تحميل PDF"
                            aria-label="تحميل PDF"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <Download className="w-4 h-4" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{`عرض ${Math.min(shown, filtered.length)} من ${filtered.length} فاتورة`}</span>
            {shown < filtered.length && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                عرض المزيد
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
