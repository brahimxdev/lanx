import type { authUsers } from "@/db/schema/index.js";
import type { IAuthenticatedUser } from "@/modules/auth/auth.types.js";

export type IAuthUser = Pick<
  typeof authUsers.$inferSelect,
  "id" | "email" | "isEmailVerified" | "createdAt"
>;

export const sanitizeUser = (user: IAuthUser): IAuthenticatedUser => ({
  id: user.id,
  email: user.email,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});
