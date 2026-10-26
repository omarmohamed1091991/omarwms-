CREATE TABLE "appointment_messages" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"template_id" integer,
	"patient_name" text NOT NULL,
	"patient_phone" text NOT NULL,
	"appointment_date" text NOT NULL,
	"appointment_time" text NOT NULL,
	"doctor_name" text DEFAULT '' NOT NULL,
	"message_text" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"error" text,
	"whatsapp_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_templates" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"body" text NOT NULL,
	"meta_template_name" text,
	"meta_language" text,
	"param_map" jsonb DEFAULT '{}' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "appointment_messages_user_id_idx" ON "appointment_messages" ("user_id");--> statement-breakpoint
CREATE INDEX "appointment_templates_user_id_idx" ON "appointment_templates" ("user_id");--> statement-breakpoint
ALTER TABLE "appointment_messages" ADD CONSTRAINT "appointment_messages_template_id_appointment_templates_id_fkey" FOREIGN KEY ("template_id") REFERENCES "appointment_templates"("id") ON DELETE SET NULL;