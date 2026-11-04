ALTER TABLE "paymob_sessions" DROP CONSTRAINT "paymob_sessions_plan_id_pricing_plans_id_fkey";--> statement-breakpoint
ALTER TABLE "paymob_sessions" DROP CONSTRAINT "paymob_sessions_discount_code_id_discount_codes_id_fkey";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_id_pricing_plans_id_fkey";