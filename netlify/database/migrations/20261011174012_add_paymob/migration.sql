CREATE TABLE "paymob_sessions" (
	"id" serial PRIMARY KEY,
	"reference" text NOT NULL UNIQUE,
	"user_id" text NOT NULL,
	"plan_id" integer,
	"plan_name" text NOT NULL,
	"currency" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"intention_id" text,
	"paymob_order_id" text,
	"paymob_transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider" text DEFAULT 'stripe' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "paymob_transaction_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider" text DEFAULT 'stripe' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymob_transaction_id_key" UNIQUE("paymob_transaction_id");--> statement-breakpoint
CREATE INDEX "paymob_sessions_user_id_idx" ON "paymob_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "paymob_sessions_order_idx" ON "paymob_sessions" ("paymob_order_id");--> statement-breakpoint
ALTER TABLE "paymob_sessions" ADD CONSTRAINT "paymob_sessions_plan_id_pricing_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id") ON DELETE SET NULL;