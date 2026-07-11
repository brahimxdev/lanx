import type { authUsers } from "@/db/schema/index.js";

export type IAuthenticatedUser = Pick<
  typeof authUsers.$inferSelect,
  "id" | "email" | "isEmailVerified" | "createdAt"
>;
