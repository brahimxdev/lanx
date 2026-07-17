import { db } from "@/db/client.js";
import type { Executor } from "@/db/executor.js";
import { type confirmationTypeEnum, emailConfirmations } from "@/db/schema/index.js";
import { AppError } from "@/errors/AppError.js";
import { eq, sql, desc, and, isNull } from "drizzle-orm";

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

  // Invalidate all unused confirmation codes
  async invalidateAllUnused(
    authUserId: string,
    confirmationType: (typeof confirmationTypeEnum.enumValues)[number],
    executor: Executor = db
  ) {
    await executor
      .update(emailConfirmations)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailConfirmations.authUserId, authUserId),
          eq(emailConfirmations.confirmationType, confirmationType),
          isNull(emailConfirmations.usedAt)
        )
      );
  },
};
