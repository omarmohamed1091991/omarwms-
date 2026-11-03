"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { discountCodes } from "@/db/schema"
import { requireAdmin } from "@/lib/auth"
import { normalizeCode } from "@/lib/discounts"

export type DiscountInput = {
  code: string
  percentOff: string
  description: string
  maxUses: string
  expiresAt: string // YYYY-MM-DD أو فارغ
  isActive: boolean
}

type Result = { success: true } | { success: false; error: string }

function parse(input: DiscountInput) {
  const code = normalizeCode(input.code)
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error("الكود يجب أن يكون من 3 إلى 32 حرفاً إنجليزياً أو رقماً بدون مسافات")
  const percentOff = Number(input.percentOff)
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) throw new Error("نسبة الخصم يجب أن تكون رقماً صحيحاً بين 1 و 100")
  const maxUses = input.maxUses.trim() ? Number(input.maxUses) : null
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) throw new Error("الحد الأقصى للاستخدام غير صالح")
  let expiresAt: Date | null = null
  if (input.expiresAt.trim()) {
    expiresAt = new Date(`${input.expiresAt.trim()}T23:59:59`)
    if (Number.isNaN(expiresAt.getTime())) throw new Error("تاريخ الانتهاء غير صالح")
  }
  return { code, percentOff, description: input.description.trim(), maxUses, expiresAt, isActive: input.isActive }
}

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await requireAdmin()
    await fn()
    revalidatePath("/users")
    return { success: true }
  } catch (error: any) {
    const duplicate = error?.code === "23505" || error?.cause?.code === "23505" || /unique|duplicate/i.test(String(error?.message))
    if (duplicate) return { success: false, error: "هذا الكود مستخدم بالفعل، اختر كوداً آخر" }
    console.error("[discounts] action failed:", error)
    return { success: false, error: error instanceof Error ? error.message : "حدث خطأ غير متوقع" }
  }
}

export async function createDiscountCode(input: DiscountInput) {
  return run(() => db.insert(discountCodes).values(parse(input)))
}

export async function updateDiscountCode(id: number, input: DiscountInput) {
  return run(() =>
    db
      .update(discountCodes)
      .set({ ...parse(input), updatedAt: new Date() })
      .where(eq(discountCodes.id, id)),
  )
}

export async function setDiscountCodeActive(id: number, isActive: boolean) {
  return run(() => db.update(discountCodes).set({ isActive, updatedAt: new Date() }).where(eq(discountCodes.id, id)))
}

export async function deleteDiscountCode(id: number) {
  return run(() => db.delete(discountCodes).where(eq(discountCodes.id, id)))
}
