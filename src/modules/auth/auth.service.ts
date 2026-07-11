import type { ISignupInput } from "./auth.validation.js";
import { db } from "@/db/client.js";
import { authUsers } from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { AppError, ErrorCode } from "@/errors/index.js";

export class AuthService {
  static async createAuthUser(input: ISignupInput) {
    const [user] = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, input.email))
      .limit(1);

    if (user) {
      throw AppError.conflict(
        "An account with this email already exists, please",
        ErrorCode.ALREADY_EXISTS
      );
    }
  }
}
