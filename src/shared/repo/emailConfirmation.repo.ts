import { db } from "@/db/client.js";
import type { Executor } from "@/db/executor.js";
import { emailConfirmations } from "@/db/schema/index.js";
import { AppError } from "@/errors/AppError.js";
import { eq, sql, desc, and, isNull } from "drizzle-orm";

type EmailConfirmation = typeof emailConfirmations.$inferSelect;
type CreateEmailConfirmation = typeof emailConfirmations.$inferInsert;
type ConfirmationType = (typeof emailConfirmations.confirmationType.enumValues)[number];

// Interface - What the service binds against
export interface IEmailConfirmationRepo {
  create(data: CreateEmailConfirmation, executor?: Executor): Promise<EmailConfirmation>;
  findLatestUnused(authUserId: string, executor?: Executor): Promise<EmailConfirmation | null>;
  incrementAttemptCount(id: string, executor?: Executor): Promise<void>;
  markUsed(id: string, executor?: Executor): Promise<void>;
  invalidateAllUnused(
    authUserId: string,
    type: ConfirmationType,
    executor?: Executor
  ): Promise<void>;
}

// class implementing the interface
export class EmailConfirmationRepo implements IEmailConfirmationRepo {
  // Create emailConfirmation record
  async create(data: CreateEmailConfirmation, executor: Executor = db): Promise<EmailConfirmation> {
    const [insertedConfirmationRecord] = await executor
      .insert(emailConfirmations)
      .values(data)
      .returning();

    if (!insertedConfirmationRecord) {
      throw AppError.internalServerError("Failed to create confirmation code");
    }
    return insertedConfirmationRecord;
  }

  // Fetch the Latest UNUSED confirmation for the user, regardless of type.
  async findLatestUnused(
    authUserId: string,
    executor: Executor = db
  ): Promise<EmailConfirmation | null> {
    const [confirmationRecord] = await executor
      .select()
      .from(emailConfirmations)
      .where(and(eq(emailConfirmations.authUserId, authUserId), isNull(emailConfirmations.usedAt)))
      .orderBy(desc(emailConfirmations.createdAt))
      .limit(1);
    return confirmationRecord ?? null;
  }

  // Increment attempt count
  async incrementAttemptCount(id: string, executor: Executor = db): Promise<void> {
    await executor
      .update(emailConfirmations)
      .set({ attemptCount: sql`${emailConfirmations.attemptCount} + 1` })
      .where(eq(emailConfirmations.id, id));
  }

  // Mark code as used
  async markUsed(id: string, executor: Executor = db): Promise<void> {
    await executor
      .update(emailConfirmations)
      .set({ usedAt: new Date() })
      .where(and(eq(emailConfirmations.id, id), isNull(emailConfirmations.usedAt)));
  }

  async invalidateAllUnused(
    authUserId: string,
    confirmationType: ConfirmationType,
    executor: Executor = db
  ): Promise<void> {
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
  }
}

// Singletong instance
export const emailConfirmationRepo = new EmailConfirmationRepo();
