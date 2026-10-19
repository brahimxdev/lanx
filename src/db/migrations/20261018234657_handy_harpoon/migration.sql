CREATE TYPE "confirmation_type" AS ENUM('sign_up', 'change_email', 'password_reset');--> statement-breakpoint
CREATE TYPE "profession_source_enum" AS ENUM('seed', 'admin');--> statement-breakpoint
CREATE TYPE "discount_type" AS ENUM('fixed', 'percentage');--> statement-breakpoint
CREATE TYPE "proposal_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'changes_requested', 'declined', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"password_changed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"auth_user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"new_email" text,
	"confirmation_type" "confirmation_type" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "attempt_count_check" CHECK ("attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"auth_user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" inet,
	"location" jsonb,
	"user_agent" text,
	"device_type" text,
	"device_os" text,
	"device_browser" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"auth_user_id" uuid PRIMARY KEY,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"business_name" text,
	"logo_url" text,
	"profession_id" uuid,
	"country_code" char(2),
	"currency_code" char(3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"code" char(2) PRIMARY KEY,
	"name" text NOT NULL,
	"default_currency_code" char(3)
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" char(3) PRIMARY KEY,
	"name" text NOT NULL,
	"symbol" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"source" "profession_source_enum" DEFAULT 'seed'::"profession_source_enum" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"auth_user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"company_name" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"queue_name" text NOT NULL,
	"job_id" text NOT NULL,
	"job_name" text NOT NULL,
	"payload" jsonb NOT NULL,
	"error_message" text NOT NULL,
	"error_stack" text,
	"attempts_made" integer NOT NULL,
	"failed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"proposal_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10,2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(10,2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10,2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "quantity_check" CHECK ("quantity" >= 1.00),
	CONSTRAINT "unit_price_check" CHECK ("unit_price" >= 0.00),
	CONSTRAINT "total_amount_check" CHECK ("total_amount" >= 0.00),
	CONSTRAINT "line_item_total_amount_consistency_check" CHECK ("total_amount" = ROUND("quantity" * "unit_price", 2))
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"auth_user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "proposal_status" DEFAULT 'draft'::"proposal_status" NOT NULL,
	"currency_code" char(3) NOT NULL,
	"expires_at" timestamp with time zone,
	"public_token_hash" text,
	"sub_total" numeric(10,2) DEFAULT '0' NOT NULL,
	"discount_type" "discount_type",
	"discount_fixed_value" numeric(10,2),
	"discount_percentage_value" numeric(5,2),
	"discount_amount" numeric(10,2),
	"total_amount" numeric(10,2) DEFAULT '0' NOT NULL,
	"sent_at" timestamp with time zone,
	"last_sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"changes_requested_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"canelled_at" timestamp with time zone,
	CONSTRAINT "sub_total_check" CHECK ("sub_total" >= 0.00),
	CONSTRAINT "total_amount_check" CHECK ("total_amount" >= 0.00),
	CONSTRAINT "discount_value_exclusivity_check" CHECK (("discount_type" = 'fixed'
             AND "discount_fixed_value" IS NOT NULL
             AND "discount_percentage_value" IS NULL)
          OR ("discount_type" = 'percentage'
             AND "discount_percentage_value" IS NOT NULL
             AND "discount_fixed_value" IS NULL)
          OR ("discount_type" IS NULL
             AND "discount_fixed_value" IS NULL
             AND "discount_percentage_value" IS NULL)),
	CONSTRAINT "discount_amount_presence_check" CHECK (("discount_type" IS NULL AND "discount_amount" IS NULL)
          OR ("discount_type" IS NOT NULL AND "discount_amount" IS NOT NULL)),
	CONSTRAINT "discount_fixed_value_check" CHECK ("discount_fixed_value" IS NULL
          OR ("discount_fixed_value" >= 0.00 AND "discount_fixed_value" <= "sub_total")),
	CONSTRAINT "discount_percentage_value_check" CHECK ("discount_percentage_value" IS NULL
          OR ("discount_percentage_value" >= 0.00 AND "discount_percentage_value" <= 100.00)),
	CONSTRAINT "discount_amount_check" CHECK ("discount_amount" IS NULL
          OR ("discount_amount" >= 0.00 AND "discount_amount" <= "sub_total")),
	CONSTRAINT "discount_amount_fixed_consistency_check" CHECK ("discount_type" IS DISTINCT FROM 'fixed'
          OR "discount_amount" = "discount_fixed_value"),
	CONSTRAINT "total_amount_consistency_check" CHECK ("total_amount" = "sub_total" - COALESCE("discount_amount", 0.00))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_email_unique_active" ON "auth_users" ("email") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_email_confirmations_auth_user_id" ON "email_confirmations" ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_email_confirmations_expires-at" ON "email_confirmations" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_confirmation" ON "email_confirmations" ("auth_user_id","confirmation_type") WHERE "used_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_auth_user_id" ON "sessions" ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_active" ON "sessions" ("auth_user_id","device_id") WHERE "revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_device_lookup" ON "sessions" ("auth_user_id","device_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_auth_user_id_unique" ON "profiles" ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_profession_id" ON "profiles" ("profession_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_country_code" ON "profiles" ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "professions_slug_unique" ON "professions" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "professions_name_unique" ON "professions" (lower("name"));--> statement-breakpoint
CREATE INDEX "idx_professions_name" ON "professions" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_clients_auth_user_id_email" ON "clients" ("auth_user_id","email") WHERE "archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_clients_auth_user_id" ON "clients" ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_clients_created_at" ON "clients" ("created_at");--> statement-breakpoint
CREATE INDEX "idx_job_failures_queue_name" ON "job_failures" ("queue_name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_job_failures_queue_job_unique" ON "job_failures" ("queue_name","job_id");--> statement-breakpoint
CREATE INDEX "idx_proposals_auth_user_id" ON "proposals" ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_proposals_client_id" ON "proposals" ("client_id");--> statement-breakpoint
CREATE INDEX "idx_proposals_status" ON "proposals" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_public_token_hash_unique" ON "proposals" ("public_token_hash");--> statement-breakpoint
ALTER TABLE "email_confirmations" ADD CONSTRAINT "email_confirmations_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_profession_id_professions_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_country_code_countries_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_currency_code_currencies_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_default_currency_code_currencies_code_fkey" FOREIGN KEY ("default_currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "proposal_line_items" ADD CONSTRAINT "proposal_line_items_proposal_id_proposals_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT;