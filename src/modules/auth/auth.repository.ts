import { db } from "@/db/client.js";
import type { Executor } from "@/db/executor.js";
import { authUsers, emailConfirmations } from "@/db/schema/index.js";
import { AppError } from "@/errors/AppError.js";
import { eq } from "drizzle-orm";

// auth user table db call
export const authUserRepository = {
  // Check authUsers table if user exist by email
  async findByEmail(email: string, executor: Executor = db) {
    const [user] = await executor
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, email))
      .limit(1);
    return user ?? null;
  },

  // Create user in authUsers table
  async createUser(data: typeof authUsers.$inferInsert, executor: Executor = db) {
    const [user] = await executor.insert(authUsers).values(data).returning();
    if (!user) {
      throw AppError.internalServerError("Failed to create auth user");
    }
    return user;
  },
};

// email confirmation table db call
export const emailConfirmationRepository = {
  // Create emailConfirmation record
  async create(data: typeof emailConfirmations.$inferInsert, executor: Executor = db) {
    const [emailConfirmation] = await executor.insert(emailConfirmations).values(data).returning();

    if (!emailConfirmation) {
      throw AppError.internalServerError("Failed to create confirmation code");
    }
    return emailConfirmation;
  },
};
