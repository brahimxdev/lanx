CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"auth_user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_auth_user_id_auth_users_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT;
