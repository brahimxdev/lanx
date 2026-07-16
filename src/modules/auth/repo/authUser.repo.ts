import { db } from "@/db/client.js";
import type { Executor } from "@/db/executor.js";
import { authUsers } from "@/db/schema/index.js";
import { AppError } from "@/errors/AppError.js";
import { eq, and, isNull } from "drizzle-orm";

// auth user table db call
export const authUserRepository = {
  // Check authUsers table if user exist by email
  async findByEmail(email: string, executor: Executor = db) {
    const [user] = await executor
      .select()
      .from(authUsers)
      .where(and(eq(authUsers.email, email), isNull(authUsers.deletedAt)))
      .limit(1);
    return user ?? null;
  },

  // Find user by id
  async findById(id: string, executor: Executor = db) {
    const [user] = await executor
      .select()
      .from(authUsers)
      .where(and(eq(authUsers.id, id), isNull(authUsers.deletedAt)))
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

  // Mark email verified
  async markEmailVerified(authUserId: string, executor: Executor = db) {
    const [user] = await executor
      .update(authUsers)
      .set({ isEmailVerified: true })
      .where(eq(authUsers.id, authUserId))
      .returning();

    if (!user) {
      throw AppError.internalServerError("Failed to verify user");
    }

    return user;
  },

  // Update password
  async updatePassword(authUserId: string, newPasswordHash: string, executor: Executor = db) {
    const [user] = await executor
      .update(authUsers)
      .set({ passwordHash: newPasswordHash })
      .where(and(eq(authUsers.id, authUserId), isNull(authUsers.deletedAt)))
      .returning();

    if (!user) {
      throw AppError.internalServerError("Failed to update password");
    }

    return user;
  },
};
