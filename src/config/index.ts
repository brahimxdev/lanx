import ms, { type StringValue } from "ms";
import { dbEnv } from "./db-env.js";
import { appEnv, isDev, isProd, isStaging } from "./app-env.js";

export { isDev, isProd, isStaging };

export const appConfig = {
  port: appEnv.PORT,
  url: appEnv.APP_URL,
  apiVersion: appEnv.API_VERSION,
  nodeEnv: appEnv.NODE_ENV,
} as const;

export const logConfig = {
  level: appEnv.LOG_LEVEL ?? (isDev ? "debug" : "info"),
} as const;

export const dbConfig = {
  dbUrl: dbEnv.DATABASE_URL,
} as const;

export const authConfig = {
  jwtSecret: appEnv.JWT_SECRET,
  jwtExpiresIn: appEnv.JWT_EXPIRES_IN as StringValue,
  refreshExpiresIn: appEnv.REFRESH_TOKEN_EXPIRES_IN as StringValue,
  jwtAlg: "HS256" as const,
  bcryptSaltRounds: 12,
  refreshCookieName: "refreshToken",
  refreshTokenTTL: ms(appEnv.REFRESH_TOKEN_EXPIRES_IN as StringValue), // 7 days
  refreshCookiePath: "/api/v1/auth",
  confirmationCodeTTL: 10 * 60 * 1000, // 10 mins,
  isProduction: isProd,
} as const;

export const emailConfig = {
  apiKey: appEnv.RESEND_API_KEY,
  from: appEnv.EMAIL_FROM,
} as const;

export const storageConfig = {
  r2AccountId: appEnv.R2_ACCOUNT_ID,
  r2AccessKeyId: appEnv.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: appEnv.R2_SECRET_ACCESS_KEY,
  r2PublicBucketName: appEnv.R2_PUBLIC_BUCKET_NAME,
  r2PublicBaseUrl: appEnv.R2_PUBLIC_BASE_URL,
  r2PrivateBucketName: appEnv.R2_PRIVATE_BUCKET_NAME,

  imageFileTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"] as const,
  imageFileMaxSize: 5 * 1024 * 1024,
  imageFileMaxSizeLabel: "5 MB",

  documentFileTypes: ["application/pdf"] as const,
  documentFileMaxSize: 10 * 1024 * 1024,
  documentFileMaxSizeLabel: "10 MB",
} as const;
