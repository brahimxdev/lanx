import { db } from "@/db/client.js";
import type { Executor } from "@/db/executor.js";
import { sessions } from "@/db/schema/index.js";
import { AppError } from "@/errors/AppError.js";
import { eq, and, isNull } from "drizzle-orm";

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
