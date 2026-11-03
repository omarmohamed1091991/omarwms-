"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Percent, Plus, Power, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  createDiscountCode,
  deleteDiscountCode,
  setDiscountCodeActive,
  updateDiscountCode,
  type DiscountInput,
} from "@/app/actions/discounts"

export type AdminDiscount = {
  id: number
  code: string
  percentOff: number
  description: string
  isActive: boolean
  maxUses: number | null
  expiresAt: string | null
  uses: number
}

const empty: DiscountInput = { code: "", percentOff: "10", description: "", maxUses: "", expiresAt: "", isActive: true }

function statusOf(d: AdminDiscount) {
  if (!d.isActive) return { label: "موقوف", className: "text-gray-500 border-gray-200" }
  if (d.expiresAt && new Date(d.expiresAt) < new Date()) return { label: "منتهي", className: "text-red-600 border-red-200" }
  if (d.maxUses != null && d.uses >= d.maxUses) return { label: "مستنفد", className: "text-amber-700 border-amber-200" }
  return { label: "مفعّل", className: "text-emerald-700 border-emerald-200" }
}

export function DiscountsManager({ discounts }: { discounts: AdminDiscount[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<DiscountInput>(empty)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function open(d?: AdminDiscount) {
    setError(null)
    if (!d) {
      setForm(empty)
      setEditing("new")
      return
    }
    setForm({
      code: d.code,
      percentOff: String(d.percentOff),
      description: d.description,
      maxUses: d.maxUses != null ? String(d.maxUses) : "",
      expiresAt: d.expiresAt ? d.expiresAt.slice(0, 10) : "",
      isActive: d.isActive,
    })
    setEditing(d.id)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const result = editing === "new" ? await createDiscountCode(form) : await updateDiscountCode(editing as number, form)
    setSaving(false)
    if (!result.success) return setError(result.error)
    setEditing(null)
    router.refresh()
  }

  async function act(id: number, fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusyId(id)
    const result = await fn()
    setBusyId(null)
    if (!result.success) alert(result.error)
    router.refresh()
  }

  const set = <K extends keyof DiscountInput>(key: K, value: DiscountInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
            <Percent className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">أكواد الخصم</h2>
            <p className="text-xs text-gray-500">يدخلها المستخدم اختيارياً في صفحة الدفع ويُخصم من المبلغ النهائي</p>
          </div>
        </div>
        <Button onClick={() => open()} size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs h-9 px-4 rounded-xl">
          <Plus className="w-3.5 h-3.5 ml-1.5" />
          إنشاء كود خصم
        </Button>
      </div>

      {discounts.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-10">لا توجد أكواد خصم بعد.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-right p-3 font-medium">الكود</th>
                <th className="text-right p-3 font-medium">الخصم</th>
                <th className="text-right p-3 font-medium">الاستخدام</th>
                <th className="text-right p-3 font-medium">ينتهي في</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => {
                const status = statusOf(d)
                return (
                  <tr key={d.id} className="border-t border-gray-100 bg-white">
                    <td className="p-3">
                      <p className="font-mono font-bold text-gray-900" dir="ltr">
                        {d.code}
                      </p>
                      {d.description && <p className="text-xs text-gray-500">{d.description}</p>}
                    </td>
                    <td className="p-3 font-bold text-amber-700">{d.percentOff}%</td>
                    <td className="p-3 text-gray-700">
                      {d.uses}
                      {d.maxUses != null ? ` / ${d.maxUses}` : " · غير محدود"}
                    </td>
                    <td className="p-3 text-gray-700">{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("ar-EG") : "—"}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => open(d)}>
                          <Pencil className="w-3.5 h-3.5" /> تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-8 text-xs gap-1 ${d.isActive ? "text-gray-700" : "text-emerald-700 border-emerald-200"}`}
                          disabled={busyId === d.id}
                          onClick={() => act(d.id, () => setDiscountCodeActive(d.id, !d.isActive))}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {d.isActive ? "إيقاف" : "تفعيل"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          title="حذف"
                          disabled={busyId === d.id}
                          onClick={() => confirm(`حذف كود الخصم «${d.code}» نهائياً؟`) && act(d.id, () => deleteDiscountCode(d.id))}
                        >
                          {busyId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "إنشاء كود خصم" : "تعديل كود الخصم"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>الكود *</Label>
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))}
                placeholder="WELCOME20"
                dir="ltr"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>نسبة الخصم (%) *</Label>
              <Input type="number" min="1" max="100" value={form.percentOff} onChange={(e) => set("percentOff", e.target.value)} dir="ltr" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>وصف داخلي (اختياري)</Label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="عرض الإطلاق" />
            </div>
            <div className="space-y-1.5">
              <Label>الحد الأقصى للاستخدام</Label>
              <Input type="number" min="1" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="غير محدود" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الانتهاء</Label>
              <Input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} dir="ltr" />
            </div>
            <label className="col-span-2 flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              الكود مفعّل
              <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
            </label>
          </div>
          <p className="text-xs text-gray-500">يمكن لأكثر من مستخدم استخدام نفس الكود. يُحتسب الاستخدام عند نجاح الدفع فقط.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button onClick={save} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حفظ الكود
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
