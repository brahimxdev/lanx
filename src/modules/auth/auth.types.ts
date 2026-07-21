import type { authUsers } from "@/db/schema/index.js";

export type IAuthenticatedUser = Pick<
  typeof authUsers.$inferSelect,
  "id" | "email" | "isEmailVerified" | "createdAt"
>;

export interface IRequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  deviceOs: string | null;
  deviceBrowser: string | null;
}
