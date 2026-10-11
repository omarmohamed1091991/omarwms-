import { pgTable, serial, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core"

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
    planId: integer("plan_id").references(() => pricingPlans.id, { onDelete: "set null" }),
    planName: text("plan_name").notNull(),
    currency: text().notNull(),
    amountCents: integer("amount_cents").notNull(),
    interval: text().notNull().default("month"),
    status: text().notNull().default("incomplete"),
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
    stripeInvoiceId: text("stripe_invoice_id").unique(),
    invoiceUrl: text("invoice_url"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_user_id_idx").on(t.userId)],
)

export type PricingPlan = typeof pricingPlans.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type Payment = typeof payments.$inferSelect
