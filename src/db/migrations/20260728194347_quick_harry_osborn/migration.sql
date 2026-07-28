CREATE TYPE "confirmation_type" AS ENUM('sign_up', 'change_email', 'password_reset');--> statement-breakpoint
CREATE TYPE "profession_source_enum" AS ENUM('seed', 'admin', 'user');--> statement-breakpoint
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
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"auth_user_id" uuid NOT NULL,
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
CREATE UNIQUE INDEX "auth_users_email_unique_active" ON "auth_users" ("email") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_email_confirmations_auth_user_id" ON "email_confirmations" ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_email_confirmations_expires-at" ON "email_confirmations" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_confirmation" ON "email_confirmations" ("auth_user_id","confirmation_type") WHERE "used_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_auth_user_id" ON "sessions" ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_active" ON "sessions" ("auth_user_id") WHERE "revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "professions_slug_unique" ON "professions" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_auth_user_id_unique" ON "profiles" ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_profession_id" ON "profiles" ("profession_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_country_code" ON "profiles" ("country_code");--> statement-breakpoint
ALTER TABLE "email_confirmations" ADD CONSTRAINT "email_confirmations_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_default_currency_code_currencies_code_fkey" FOREIGN KEY ("default_currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_profession_id_professions_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_country_code_countries_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_currency_code_currencies_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT;