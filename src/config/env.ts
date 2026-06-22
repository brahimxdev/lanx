import { z } from "zod";

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_URL: z.url(),
  API_VERSION: z.string().default("v1"),

  // // Database
  // DATABASE_URL: z.url(),

  // // Auth
  // JWT_SECRET: z.string().min(32),
  // JWT_EXPIRES_IN: z.string().default("15m"),
  // REFRESH_TOKEN_SECRET: z.string().min(32),
  // REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

  // // Email
  // RESEND_API_KEY: z.string().startsWith("re_"),
  // EMAIL_FROM: z.email(),

  // // Storage (Cloudinary)
  // CLOUDINARY_CLOUD_NAME: z.string().min(1),
  // CLOUDINARY_API_KEY: z.string().min(1),
  // CLOUDINARY_API_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:\n");

  const tree = z.treeifyError(parsed.error);
  Object.entries(tree.properties ?? {}).forEach(([key, node]) => {
    if (node.errors.length) {
      console.error(`  ${key}: ${node.errors.join(", ")}`);
    }
  });

  console.error("\nCheck your .env.development file against .env.example\n");
  process.exit(1);
}

export const env = parsed.data;

// Convenience booleans — use these instead of comparing strings everywhere
export const isDev = env.NODE_ENV === "development";
export const isStaging = env.NODE_ENV === "staging";
export const isProd = env.NODE_ENV === "production";
