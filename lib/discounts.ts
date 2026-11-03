import { and, count, desc, eq, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { discountCodes, paymobSessions, type DiscountCode } from "@/db/schema"

export function normalizeCode(code: unknown) {
  return String(code ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
}

/** عدد مرات الاستخدام الفعلية = عمليات الدفع الناجحة التي طُبق عليها الكود. */
export async function discountUses(id: number) {
  const [row] = await db
    .select({ n: count() })
    .from(paymobSessions)
    .where(and(eq(paymobSessions.discountCodeId, id), eq(paymobSessions.status, "paid")))
  return Number(row?.n ?? 0)
}

export function applyDiscount(amountCents: number, percentOff: number) {
  const discountCents = Math.round((amountCents * percentOff) / 100)
  return { discountCents, finalCents: Math.max(0, amountCents - discountCents) }
}

type Validation = { ok: true; discount: DiscountCode } | { ok: false; error: string }

/** يتحقق من أن الكود موجود ومفعّل وغير منتهي ولم يتجاوز حد الاستخدام. */
export async function validateDiscountCode(raw: unknown): Promise<Validation> {
  const code = normalizeCode(raw)
  if (!code) return { ok: false, error: "أدخل كود الخصم" }
  const [discount] = await db.select().from(discountCodes).where(eq(discountCodes.code, code)).limit(1)
  if (!discount) return { ok: false, error: "كود الخصم غير صحيح" }
  if (!discount.isActive) return { ok: false, error: "كود الخصم غير مفعّل حالياً" }
  if (discount.expiresAt && discount.expiresAt < new Date()) return { ok: false, error: "انتهت صلاحية كود الخصم" }
  if (discount.maxUses != null && (await discountUses(discount.id)) >= discount.maxUses) {
    return { ok: false, error: "تم استنفاد الحد الأقصى لاستخدام هذا الكود" }
  }
  return { ok: true, discount }
}

/** كل الأكواد مع عدد مرات استخدامها، للوحة الأدمن. */
export async function listDiscountCodes() {
  try {
    const [codes, usage] = await Promise.all([
      db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt)),
      db
        .select({ id: paymobSessions.discountCodeId, n: count() })
        .from(paymobSessions)
        .where(and(isNotNull(paymobSessions.discountCodeId), eq(paymobSessions.status, "paid")))
        .groupBy(paymobSessions.discountCodeId),
    ])
    const uses = new Map(usage.map((u) => [u.id, Number(u.n)]))
    return codes.map((c) => ({ ...c, uses: uses.get(c.id) ?? 0 }))
  } catch (error) {
    console.error("[discounts] Failed to load discount codes:", error)
    return []
  }
}
