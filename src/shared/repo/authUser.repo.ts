import { db } from "@/db/client.js";
import type { Executor } from "@/db/executor.js";
import { authUsers } from "@/db/schema/index.js";
import { AppError } from "@/errors/AppError.js";
import { eq, and, isNull } from "drizzle-orm";

type AuthUser = typeof authUsers.$inferSelect;
type CreateAuthUser = typeof authUsers.$inferInsert;

// Interface - what the service binds against
export interface IAuthUserRepo {
  findByEmail(email: string, executor?: Executor): Promise<AuthUser | null>;
  findById(id: string, executor?: Executor): Promise<AuthUser | null>;
  createUser(data: CreateAuthUser, executor?: Executor): Promise<AuthUser>;
  markEmailVerified(authUserId: string, executor?: Executor): Promise<AuthUser>;
  updatePassword(
    authUserId: string,
    newPasswordHash: string,
    executor?: Executor
  ): Promise<AuthUser>;
  updateEmail(authUserId: string, newEmail: string, executor?: Executor): Promise<AuthUser>;
}

// Class implementing the interface
export class AuthUserRepo implements IAuthUserRepo {
  // Check if the user exists by email
  async findByEmail(email: string, executor: Executor = db): Promise<AuthUser | null> {
    const [user] = await executor
      .select()
      .from(authUsers)
      .where(and(eq(authUsers.email, email), isNull(authUsers.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  // Find a user by id
  async findById(id: string, executor: Executor = db): Promise<AuthUser | null> {
    const [user] = await executor
      .select()
      .from(authUsers)
      .where(and(eq(authUsers.id, id), isNull(authUsers.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  // Create user in authUsers table
  async createUser(data: CreateAuthUser, executor: Executor = db): Promise<AuthUser> {
    const [user] = await executor.insert(authUsers).values(data).returning();

    if (!user) {
      throw AppError.internalServerError("Failed to create auth user");
    }

    return user;
  }

  // Mark email as verified
  async markEmailVerified(authUserId: string, executor: Executor = db): Promise<AuthUser> {
    const [user] = await executor
      .update(authUsers)
      .set({ isEmailVerified: true })
      .where(eq(authUsers.id, authUserId))
      .returning();

    if (!user) {
      throw AppError.internalServerError("Failed to verify user");
    }

    return user;
  }

  // Update password
  async updatePassword(
    authUserId: string,
    newPasswordHash: string,
    executor: Executor = db
  ): Promise<AuthUser> {
    const [user] = await executor
      .update(authUsers)
      .set({ passwordHash: newPasswordHash, passwordChangedAt: new Date() })
      .where(and(eq(authUsers.id, authUserId), isNull(authUsers.deletedAt)))
      .returning();

    if (!user) {
      throw AppError.internalServerError("Failed to update password");
    }

    return user;
  }

  // Update email
  async updateEmail(
    authUserId: string,
    newEmail: string,
    executor: Executor = db
  ): Promise<AuthUser> {
    const [user] = await executor
      .update(authUsers)
      .set({ email: newEmail })
      .where(and(eq(authUsers.id, authUserId), isNull(authUsers.deletedAt)))
      .returning();

    if (!user) {
      throw AppError.internalServerError("Failed to update email");
    }

    return user;
  }
}

// Singleton instance
export const authUserRepo = new AuthUserRepo();
