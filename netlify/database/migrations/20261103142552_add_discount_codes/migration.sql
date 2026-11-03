CREATE TABLE "discount_codes" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"percent_off" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_uses" integer,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "paymob_sessions" ADD COLUMN "discount_code_id" integer;--> statement-breakpoint
ALTER TABLE "paymob_sessions" ADD COLUMN "discount_code" text;--> statement-breakpoint
ALTER TABLE "paymob_sessions" ADD COLUMN "discount_percent" integer;--> statement-breakpoint
ALTER TABLE "paymob_sessions" ADD COLUMN "original_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "paymob_sessions" ADD CONSTRAINT "paymob_sessions_discount_code_id_discount_codes_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "discount_codes"("id") ON DELETE SET NULL;