import type { authUsers } from "@/db/schema/index.js";

export type IAuthenticatedUser = Pick<
  typeof authUsers.$inferSelect,
  "id" | "email" | "isEmailVerified" | "createdAt"
>;

export interface IRequestMeta {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  deviceType?: string | undefined;
  deviceOs?: string | undefined;
  deviceBrowser?: string | undefined;
}
