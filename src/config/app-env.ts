import { z } from "zod";
import { parseEnv } from "./env-parser.js";

// Full application env schema — everything the running server needs.

const appEnvSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_URL: z.url(),
  API_VERSION: z.string().default("v1"),

  // Logging
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).optional(),

  // Database
  DATABASE_URL: z.url(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

  // Email
  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.email(),

  // Storage (R2 Cloudflare)
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_PUBLIC_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_BASE_URL: z.url(),
  R2_PRIVATE_BUCKET_NAME: z.string().min(1),
});

export const appEnv = parseEnv(appEnvSchema, "application");

// Convenience booleans — use these instead of comparing strings everywhere
export const isDev = appEnv.NODE_ENV === "development";
export const isStaging = appEnv.NODE_ENV === "staging";
export const isProd = appEnv.NODE_ENV === "production";
