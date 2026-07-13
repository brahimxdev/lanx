import { db } from "@/db/client.js";
import type { Executor } from "@/db/executor.js";
import { authUsers, emailConfirmations, sessions } from "@/db/schema/index.js";
import { AppError } from "@/errors/AppError.js";
import { eq, sql, desc, and, isNull } from "drizzle-orm";

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
};

// email confirmation table db call
export const emailConfirmationRepository = {
  // Create emailConfirmation record
  async create(data: typeof emailConfirmations.$inferInsert, executor: Executor = db) {
    const [insertedConfirmationRecord] = await executor
      .insert(emailConfirmations)
      .values(data)
      .returning();

    if (!insertedConfirmationRecord) {
      throw AppError.internalServerError("Failed to create confirmation code");
    }
    return insertedConfirmationRecord;
  },

  // Fetch the Latest UNUSED confirmation for the user, regardless of type.
  async findLatestUnused(authUserId: string, executor: Executor = db) {
    const [confirmationRecord] = await executor
      .select()
      .from(emailConfirmations)
      .where(and(eq(emailConfirmations.authUserId, authUserId), isNull(emailConfirmations.usedAt)))
      .orderBy(desc(emailConfirmations.createdAt))
      .limit(1);
    return confirmationRecord ?? null;
  },

  // Increment attempt count
  async incrementAttemptCount(id: string, executor: Executor = db) {
    await executor
      .update(emailConfirmations)
      .set({ attemptCount: sql`${emailConfirmations.attemptCount} + 1` })
      .where(eq(emailConfirmations.id, id))
      .returning();
  },

  // Mark code as used
  async markUsed(id: string, executor: Executor = db) {
    await executor
      .update(emailConfirmations)
      .set({ usedAt: new Date() })
      .where(and(eq(emailConfirmations.id, id), isNull(emailConfirmations.usedAt)));
  },
};

// sessions table db call
export const sessionRespository = {
  // create new session record
  async createSession(data: typeof sessions.$inferInsert, executor: Executor = db) {
    const [sessionRecord] = await executor.insert(sessions).values(data).returning();

    if (!sessionRecord) {
      throw AppError.internalServerError("Failed to create session record");
    }

    return sessionRecord;
  },
  // Invalidate session
  async revokeAllActive(authUserId: string, executor: Executor = db) {
    await executor
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.authUserId, authUserId), isNull(sessions.revokedAt)));
  },
};
