import type { authUsers } from "@/db/schema/index.js";

type IAuthUser = Pick<
  typeof authUsers.$inferSelect,
  "id" | "email" | "isEmailVerified" | "createdAt"
>;

export const sanitizeUser = (user: IAuthUser): IAuthUser => ({
  id: user.id,
  email: user.email,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});
