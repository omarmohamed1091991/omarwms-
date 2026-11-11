import { CreditCard, Receipt, TicketPercent, Users } from "lucide-react"

export type AdminSection = "users" | "plans" | "discounts" | "invoices"

export const ADMIN_SECTIONS: { key: AdminSection; label: string; hint: string; icon: typeof Users }[] = [
  { key: "users", label: "قائمة المستخدمين", hint: "إدارة الحسابات والصلاحيات", icon: Users },
  { key: "plans", label: "خطط الأسعار", hint: "الباقات والأسعار المعروضة", icon: CreditCard },
  { key: "discounts", label: "أكواد الخصم", hint: "العروض وأكواد التخفيض", icon: TicketPercent },
  { key: "invoices", label: "فواتير العملاء", hint: "جميع المدفوعات والفواتير", icon: Receipt },
]

export function parseSection(value: string | string[] | undefined): AdminSection {
  const v = Array.isArray(value) ? value[0] : value
  return ADMIN_SECTIONS.some((s) => s.key === v) ? (v as AdminSection) : "users"
}
