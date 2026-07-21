CREATE TYPE "confirmation_type" AS ENUM('sign_up', 'change_email', 'password_reset');--> statement-breakpoint
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
CREATE UNIQUE INDEX "auth_users_email_unique_active" ON "auth_users" ("email") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_email_confirmations_auth_user_id" ON "email_confirmations" ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_email_confirmations_expires-at" ON "email_confirmations" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_confirmation" ON "email_confirmations" ("auth_user_id","confirmation_type") WHERE "used_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_auth_user_id" ON "sessions" ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_active" ON "sessions" ("auth_user_id") WHERE "revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" ("expires_at");--> statement-breakpoint
ALTER TABLE "email_confirmations" ADD CONSTRAINT "email_confirmations_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT;