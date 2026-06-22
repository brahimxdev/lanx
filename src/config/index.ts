import { env, isDev, isProd, isStaging } from "./env.js";

export { isDev, isProd, isStaging };

export const appConfig = {
  port: env.PORT,
  url: env.APP_URL,
  apiVersion: env.API_VERSION,
  nodeEnv: env.NODE_ENV,
} as const;

// export const databaseConfig = {
//   databaseUrl: env.DATABASE_URL,
// } as const;

// export const authConfig = {
//   jwtSecret: env.JWT_SECRET,
//   jwtExpiresIn: env.JWT_EXPIRES_IN,
//   refreshSecret: env.REFRESH_TOKEN_SECRET,
//   refreshExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
// } as const;

// export const emailConfig = {
//   apiKey: env.RESEND_API_KEY,
//   from: env.EMAIL_FROM,
// } as const;

// export const cloudinaryConfig = {
//   cloudName: env.CLOUDINARY_CLOUD_NAME,
//   apiKey: env.CLOUDINARY_API_KEY,
//   apiSecret: env.CLOUDINARY_API_SECRET,
// } as const;
