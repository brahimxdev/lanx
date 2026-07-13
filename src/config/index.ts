import type { StringValue } from "ms";
import { dbEnv } from "./db-env.js";
import { appEnv, isDev, isProd, isStaging } from "./app-env.js";

export { isDev, isProd, isStaging };

export const appConfig = {
  port: appEnv.PORT,
  url: appEnv.APP_URL,
  apiVersion: appEnv.API_VERSION,
  nodeEnv: appEnv.NODE_ENV,
} as const;

export const dbConfig = {
  dbUrl: dbEnv.DATABASE_URL,
} as const;

export const authConfig = {
  jwtSecret: appEnv.JWT_SECRET,
  jwtExpiresIn: appEnv.JWT_EXPIRES_IN as StringValue,
  refreshSecret: appEnv.REFRESH_TOKEN_SECRET,
  refreshExpiresIn: appEnv.REFRESH_TOKEN_EXPIRES_IN as StringValue,
  jwtAlg: "HS256" as const,
  refreshCookieName: "refreshToken",
  refreshTokenTTL: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
} as const;

export const emailConfig = {
  apiKey: appEnv.RESEND_API_KEY,
  from: appEnv.EMAIL_FROM,
} as const;

// export const cloudinaryConfig = {
//   cloudName: appEnv.CLOUDINARY_CLOUD_NAME,
//   apiKey: appEnv.CLOUDINARY_API_KEY,
//   apiSecret: appEnv.CLOUDINARY_API_SECRET,
// } as const;
