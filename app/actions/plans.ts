"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { pricingPlans } from "@/db/schema"
import { requireAdmin } from "@/lib/auth"

export type PlanInput = {
  name: string
  nameEn: string
  description: string
  priceEgp: string
  priceSar: string
  interval: "month" | "year"
  features: string
  isFeatured: boolean
  isActive: boolean
  sortOrder: string
}

type Result = { success: true } | { success: false; error: string }

function parse(input: PlanInput) {
  const priceEgp = Number(input.priceEgp)
  const priceSar = Number(input.priceSar)
  if (!input.name.trim()) throw new Error("اسم الخطة مطلوب")
  if (!Number.isFinite(priceEgp) || priceEgp <= 0) throw new Error("سعر الجنيه المصري غير صالح")
  if (!Number.isFinite(priceSar) || priceSar <= 0) throw new Error("سعر الريال السعودي غير صالح")
  if (input.interval !== "month" && input.interval !== "year") throw new Error("مدة الفوترة غير صالحة")
  return {
    name: input.name.trim(),
    nameEn: input.nameEn.trim(),
    description: input.description.trim(),
    priceEgpCents: Math.round(priceEgp * 100),
    priceSarCents: Math.round(priceSar * 100),
    interval: input.interval,
    features: input.features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean),
    isFeatured: input.isFeatured,
    isActive: input.isActive,
    sortOrder: Number(input.sortOrder) || 0,
  }
}

function refresh() {
  revalidatePath("/users")
  revalidatePath("/")
}

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await requireAdmin()
    await fn()
    refresh()
    return { success: true }
  } catch (error) {
    console.error("[plans] action failed:", error)
    return { success: false, error: error instanceof Error ? error.message : "حدث خطأ غير متوقع" }
  }
}

export async function createPlan(input: PlanInput) {
  return run(() => db.insert(pricingPlans).values(parse(input)))
}

export async function updatePlan(id: number, input: PlanInput) {
  return run(() =>
    db
      .update(pricingPlans)
      .set({ ...parse(input), updatedAt: new Date() })
      .where(eq(pricingPlans.id, id)),
  )
}

export async function setPlanActive(id: number, isActive: boolean) {
  return run(() => db.update(pricingPlans).set({ isActive, updatedAt: new Date() }).where(eq(pricingPlans.id, id)))
}

// حذف الخطة لا يؤثر على الاشتراكات القائمة؛ تستمر بالسعر الذي تم الاشتراك به.
export async function deletePlan(id: number) {
  return run(() => db.delete(pricingPlans).where(eq(pricingPlans.id, id)))
}
