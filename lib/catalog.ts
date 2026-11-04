import { createAdminClient } from "@/lib/supabase/admin"
import type { DiscountCode, PricingPlan } from "@/db/schema"

// خطط الأسعار وأكواد الخصم محفوظة في Supabase (جدولا pricing_plans و discount_codes).
// الاشتراكات والمدفوعات وجلسات الدفع تبقى في Netlify Database وتشير إليها بالمعرّف فقط.

type Row = Record<string, any>

function fail(error: { message: string; code?: string }): never {
  throw Object.assign(new Error(error.message), { code: error.code })
}

const date = (v: unknown) => (v ? new Date(v as string) : null)

function toPlan(r: Row): PricingPlan {
  return {
    id: r.id,
    name: r.name,
    nameEn: r.name_en ?? "",
    description: r.description ?? "",
    priceEgpCents: r.price_egp_cents,
    priceSarCents: r.price_sar_cents,
    interval: r.interval ?? "month",
    features: Array.isArray(r.features) ? r.features : [],
    isFeatured: !!r.is_featured,
    isActive: r.is_active !== false,
    sortOrder: r.sort_order ?? 0,
    createdAt: date(r.created_at) ?? new Date(),
    updatedAt: date(r.updated_at) ?? new Date(),
  }
}

function toDiscount(r: Row): DiscountCode {
  return {
    id: r.id,
    code: r.code,
    percentOff: r.percent_off,
    description: r.description ?? "",
    isActive: r.is_active !== false,
    maxUses: r.max_uses ?? null,
    expiresAt: date(r.expires_at),
    createdAt: date(r.created_at) ?? new Date(),
    updatedAt: date(r.updated_at) ?? new Date(),
  }
}

export type PlanValues = Omit<PricingPlan, "id" | "createdAt" | "updatedAt">
export type DiscountValues = Omit<DiscountCode, "id" | "createdAt" | "updatedAt">

function planRow(v: Partial<PlanValues>): Row {
  const row: Row = { updated_at: new Date().toISOString() }
  if (v.name !== undefined) row.name = v.name
  if (v.nameEn !== undefined) row.name_en = v.nameEn
  if (v.description !== undefined) row.description = v.description
  if (v.priceEgpCents !== undefined) row.price_egp_cents = v.priceEgpCents
  if (v.priceSarCents !== undefined) row.price_sar_cents = v.priceSarCents
  if (v.interval !== undefined) row.interval = v.interval
  if (v.features !== undefined) row.features = v.features
  if (v.isFeatured !== undefined) row.is_featured = v.isFeatured
  if (v.isActive !== undefined) row.is_active = v.isActive
  if (v.sortOrder !== undefined) row.sort_order = v.sortOrder
  return row
}

function discountRow(v: Partial<DiscountValues>): Row {
  const row: Row = { updated_at: new Date().toISOString() }
  if (v.code !== undefined) row.code = v.code
  if (v.percentOff !== undefined) row.percent_off = v.percentOff
  if (v.description !== undefined) row.description = v.description
  if (v.isActive !== undefined) row.is_active = v.isActive
  if (v.maxUses !== undefined) row.max_uses = v.maxUses
  if (v.expiresAt !== undefined) row.expires_at = v.expiresAt ? v.expiresAt.toISOString() : null
  return row
}

const sb = () => createAdminClient()

// ---------- خطط الأسعار ----------

export async function selectPlans(activeOnly = false) {
  let query = sb().from("pricing_plans").select("*")
  if (activeOnly) query = query.eq("is_active", true)
  const { data, error } = await query.order("sort_order", { ascending: true }).order("id", { ascending: true })
  if (error) fail(error)
  return (data ?? []).map(toPlan)
}

export async function selectPlan(id: number) {
  const { data, error } = await sb().from("pricing_plans").select("*").eq("id", id).maybeSingle()
  if (error) fail(error)
  return data ? toPlan(data) : null
}

export async function insertPlan(values: PlanValues) {
  const { error } = await sb().from("pricing_plans").insert(planRow(values))
  if (error) fail(error)
}

export async function patchPlan(id: number, values: Partial<PlanValues>) {
  const { error } = await sb().from("pricing_plans").update(planRow(values)).eq("id", id)
  if (error) fail(error)
}

export async function removePlan(id: number) {
  const { error } = await sb().from("pricing_plans").delete().eq("id", id)
  if (error) fail(error)
}

// ---------- أكواد الخصم ----------

export async function selectDiscounts() {
  const { data, error } = await sb().from("discount_codes").select("*").order("created_at", { ascending: false })
  if (error) fail(error)
  return (data ?? []).map(toDiscount)
}

export async function selectDiscountByCode(code: string) {
  const { data, error } = await sb().from("discount_codes").select("*").eq("code", code).maybeSingle()
  if (error) fail(error)
  return data ? toDiscount(data) : null
}

export async function insertDiscount(values: DiscountValues) {
  const { error } = await sb().from("discount_codes").insert(discountRow(values))
  if (error) fail(error)
}

export async function patchDiscount(id: number, values: Partial<DiscountValues>) {
  const { error } = await sb().from("discount_codes").update(discountRow(values)).eq("id", id)
  if (error) fail(error)
}

export async function removeDiscount(id: number) {
  const { error } = await sb().from("discount_codes").delete().eq("id", id)
  if (error) fail(error)
}
