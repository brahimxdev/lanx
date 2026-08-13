ALTER TABLE "sessions" ADD COLUMN "device_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "professions" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "professions" ALTER COLUMN "source" DROP DEFAULT;--> statement-breakpoint
DROP TYPE "profession_source_enum";--> statement-breakpoint
CREATE TYPE "profession_source_enum" AS ENUM('seed', 'admin');--> statement-breakpoint
ALTER TABLE "professions" ALTER COLUMN "source" SET DATA TYPE "profession_source_enum" USING "source"::"profession_source_enum";--> statement-breakpoint
ALTER TABLE "professions" ALTER COLUMN "source" SET DEFAULT 'seed'::"profession_source_enum";--> statement-breakpoint
DROP INDEX "idx_sessions_active";--> statement-breakpoint
CREATE INDEX "idx_sessions_active" ON "sessions" ("auth_user_id","device_id") WHERE "revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_user_device_lookup" ON "sessions" ("auth_user_id","device_id","expires_at");