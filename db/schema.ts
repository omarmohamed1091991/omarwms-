import { pgTable, serial, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core"

// جدول قديم: خطط الأسعار أصبحت تُحفظ وتُقرأ من Supabase (lib/catalog.ts). يبقى هنا لعدم حذف بيانات سابقة.
// خطط الأسعار التي يديرها الأدمن. المبالغ مخزنة بأصغر وحدة (قرش / هللة).
export const pricingPlans = pgTable("pricing_plans", {
  id: serial().primaryKey(),
  name: text().notNull(),
  nameEn: text("name_en").notNull().default(""),
  description: text().notNull().default(""),
  priceEgpCents: integer("price_egp_cents").notNull(),
  priceSarCents: integer("price_sar_cents").notNull(),
  interval: text().notNull().default("month"), // month | year
  features: jsonb().$type<string[]>().notNull().default([]),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// اشتراكات Stripe المتجددة تلقائياً. user_id هو معرّف المستخدم في Supabase.
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    planId: integer("plan_id"), // معرّف الخطة في Supabase
    planName: text("plan_name").notNull(),
    currency: text().notNull(),
    amountCents: integer("amount_cents").notNull(),
    interval: text().notNull().default("month"),
    status: text().notNull().default("incomplete"),
    provider: text().notNull().default("stripe"), // stripe | paymob
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_user_id_idx").on(t.userId)],
)

// سجل المدفوعات (كل فاتورة مدفوعة سواء أول دفعة أو تجديد).
export const payments = pgTable(
  "payments",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    subscriptionId: integer("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    planName: text("plan_name").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text().notNull(),
    status: text().notNull(),
    provider: text().notNull().default("stripe"), // stripe | paymob
    stripeInvoiceId: text("stripe_invoice_id").unique(),
    paymobTransactionId: text("paymob_transaction_id").unique(),
    invoiceUrl: text("invoice_url"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_user_id_idx").on(t.userId)],
)

// جدول قديم: أكواد الخصم أصبحت تُحفظ وتُقرأ من Supabase (lib/catalog.ts). يبقى هنا لعدم حذف بيانات سابقة.
// أكواد الخصم التي ينشئها الأدمن. الكود الواحد يمكن أن يستخدمه أكثر من مستخدم.
export const discountCodes = pgTable("discount_codes", {
  id: serial().primaryKey(),
  code: text().notNull().unique(), // يُخزن بأحرف كبيرة
  percentOff: integer("percent_off").notNull(), // 1 - 100
  description: text().notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  maxUses: integer("max_uses"), // null = غير محدود
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// جلسات دفع Paymob (دفعة واحدة لكل فترة). تُنشأ قبل التحويل لصفحة Paymob وتُحدَّث عند تأكيد العملية.
export const paymobSessions = pgTable(
  "paymob_sessions",
  {
    id: serial().primaryKey(),
    reference: text().notNull().unique(), // special_reference المرسل إلى Paymob
    userId: text("user_id").notNull(),
    planId: integer("plan_id"), // معرّف الخطة في Supabase
    planName: text("plan_name").notNull(),
    currency: text().notNull(), // egp | sar
    amountCents: integer("amount_cents").notNull(),
    interval: text().notNull().default("month"),
    status: text().notNull().default("pending"), // pending | paid | failed
    intentionId: text("intention_id"),
    paymobOrderId: text("paymob_order_id"),
    paymobTransactionId: text("paymob_transaction_id"),
    // كود الخصم المطبق (إن وُجد). amountCents هو المبلغ النهائي بعد الخصم.
    discountCodeId: integer("discount_code_id"), // معرّف الكود في Supabase
    discountCode: text("discount_code"),
    discountPercent: integer("discount_percent"),
    originalAmountCents: integer("original_amount_cents"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("paymob_sessions_user_id_idx").on(t.userId), index("paymob_sessions_order_idx").on(t.paymobOrderId)],
)

// قوالب رسائل تأكيد المواعيد الخاصة بكل مستخدم. النص يحتوي على متغيرات مثل {{الاسم}}.
// إذا رُبط القالب بقالب واتساب معتمد من Meta يُرسل كقالب، و paramMap يحدد قيمة كل متغير في قالب Meta.
export const appointmentTemplates = pgTable(
  "appointment_templates",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    name: text().notNull(),
    body: text().notNull(),
    metaTemplateName: text("meta_template_name"),
    metaLanguage: text("meta_language"),
    paramMap: jsonb("param_map").$type<Record<string, string>>().notNull().default({}),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("appointment_templates_user_id_idx").on(t.userId)],
)

// سجل رسائل تأكيد المواعيد المرسلة.
export const appointmentMessages = pgTable(
  "appointment_messages",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    templateId: integer("template_id").references(() => appointmentTemplates.id, { onDelete: "set null" }),
    patientName: text("patient_name").notNull(),
    patientPhone: text("patient_phone").notNull(),
    appointmentDate: text("appointment_date").notNull(),
    appointmentTime: text("appointment_time").notNull(),
    doctorName: text("doctor_name").notNull().default(""),
    messageText: text("message_text").notNull(),
    status: text().notNull().default("sent"), // sent | failed
    error: text(),
    whatsappMessageId: text("whatsapp_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("appointment_messages_user_id_idx").on(t.userId)],
)

export type PricingPlan = typeof pricingPlans.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type Payment = typeof payments.$inferSelect
export type DiscountCode = typeof discountCodes.$inferSelect
export type PaymobSession = typeof paymobSessions.$inferSelect
export type AppointmentTemplate = typeof appointmentTemplates.$inferSelect
export type AppointmentMessage = typeof appointmentMessages.$inferSelect
