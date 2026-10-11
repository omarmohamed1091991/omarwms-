"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Pencil, Plus, Star, Tag, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPlan, deletePlan, setPlanActive, updatePlan, type PlanInput } from "@/app/actions/plans"

export type AdminPlan = {
  id: number
  name: string
  nameEn: string
  description: string
  priceEgpCents: number
  priceSarCents: number
  interval: string
  features: string[]
  isFeatured: boolean
  isActive: boolean
  sortOrder: number
  subscribers: number
}

const empty: PlanInput = {
  name: "",
  nameEn: "",
  description: "",
  priceEgp: "",
  priceSar: "",
  interval: "month",
  features: "",
  isFeatured: false,
  isActive: true,
  sortOrder: "0",
}

const money = (cents: number) => (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })

export function PlansManager({ plans }: { plans: AdminPlan[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<PlanInput>(empty)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function open(plan?: AdminPlan) {
    setError(null)
    if (!plan) {
      setForm({ ...empty, sortOrder: String(plans.length + 1) })
      setEditing("new")
      return
    }
    setForm({
      name: plan.name,
      nameEn: plan.nameEn,
      description: plan.description,
      priceEgp: String(plan.priceEgpCents / 100),
      priceSar: String(plan.priceSarCents / 100),
      interval: plan.interval === "year" ? "year" : "month",
      features: plan.features.join("\n"),
      isFeatured: plan.isFeatured,
      isActive: plan.isActive,
      sortOrder: String(plan.sortOrder),
    })
    setEditing(plan.id)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const result = editing === "new" ? await createPlan(form) : await updatePlan(editing as number, form)
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

  const set = <K extends keyof PlanInput>(key: K, value: PlanInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
            <Tag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">خطط الأسعار</h2>
            <p className="text-xs text-gray-500">تظهر الخطط النشطة في الصفحة الرئيسية وصفحة الدفع</p>
          </div>
        </div>
        <Button onClick={() => open()} size="sm" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs h-9 px-4 rounded-xl">
          <Plus className="w-3.5 h-3.5 ml-1.5" />
          إضافة خطة
        </Button>
      </div>

      {plans.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-10">لا توجد خطط بعد. أضف أول خطة أسعار.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`rounded-2xl border p-5 bg-white ${plan.isActive ? "border-gray-100" : "border-dashed border-gray-300 opacity-70"}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    {plan.isFeatured && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                  </div>
                  {plan.nameEn && <p className="text-xs text-gray-400" dir="ltr">{plan.nameEn}</p>}
                </div>
                <Badge variant="outline" className={plan.isActive ? "text-emerald-700 border-emerald-200" : "text-gray-500"}>
                  {plan.isActive ? "معروضة" : "مخفية"}
                </Badge>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">
                {money(plan.priceEgpCents)} <span className="text-sm font-normal text-gray-500">ج.م</span>
              </p>
              <p className="text-sm text-emerald-700 mb-3">
                ≈ {money(plan.priceSarCents)} ر.س · {plan.interval === "year" ? "سنوياً" : "شهرياً"}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {plan.features.length} ميزة · {plan.subscribers} مشترك نشط · ترتيب {plan.sortOrder}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => open(plan)}>
                  <Pencil className="w-3.5 h-3.5" /> تعديل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  title={plan.isActive ? "إخفاء" : "عرض"}
                  disabled={busyId === plan.id}
                  onClick={() => act(plan.id, () => setPlanActive(plan.id, !plan.isActive))}
                >
                  {plan.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  title="حذف"
                  disabled={busyId === plan.id}
                  onClick={() => {
                    const warn = plan.subscribers > 0 ? `\nيوجد ${plan.subscribers} مشترك نشط؛ ستستمر اشتراكاتهم بالسعر الحالي.` : ""
                    if (confirm(`حذف خطة «${plan.name}» نهائياً؟${warn}`)) act(plan.id, () => deletePlan(plan.id))
                  }}
                >
                  {busyId === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "إضافة خطة أسعار" : "تعديل خطة الأسعار"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <Label>اسم الخطة *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="الباقة الاحترافية" />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <Label>الاسم بالإنجليزية</Label>
              <Input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} placeholder="Professional" dir="ltr" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>الوصف</Label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>السعر بالجنيه (ج.م) *</Label>
              <Input type="number" min="0" step="0.01" value={form.priceEgp} onChange={(e) => set("priceEgp", e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>السعر بالريال (ر.س) *</Label>
              <Input type="number" min="0" step="0.01" value={form.priceSar} onChange={(e) => set("priceSar", e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>مدة التجديد</Label>
              <Select value={form.interval} onValueChange={(v) => set("interval", v as PlanInput["interval"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">شهري</SelectItem>
                  <SelectItem value="year">سنوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ترتيب العرض</Label>
              <Input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} dir="ltr" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>المزايا (ميزة في كل سطر)</Label>
              <Textarea rows={5} value={form.features} onChange={(e) => set("features", e.target.value)} />
            </div>
            <label className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              عرض في الموقع
              <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              الأكثر طلباً
              <Switch checked={form.isFeatured} onCheckedChange={(v) => set("isFeatured", v)} />
            </label>
          </div>
          {editing !== "new" && (
            <p className="text-xs text-gray-500">تغيير السعر يطبق على الاشتراكات الجديدة فقط؛ يستمر المشتركون الحاليون بسعرهم.</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حفظ الخطة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
