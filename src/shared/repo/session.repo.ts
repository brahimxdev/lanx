import { db } from "@/db/client.js";
import type { Executor } from "@/db/executor.js";
import { sessions } from "@/db/schema/index.js";
import { AppError } from "@/errors/AppError.js";
import type { IListSessionsQuery } from "@/modules/account/account.validation.js";
import { eq, and, isNull, lte, gt, isNotNull, asc, desc, sql } from "drizzle-orm";

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

  // Invalidate all sessions
  async revokeAllActive(authUserId: string, executor: Executor = db) {
    await executor
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.authUserId, authUserId), isNull(sessions.revokedAt)));
  },

  // Invalidate a specific session
  async revokeSession(sessionId: string, executor: Executor = db) {
    await executor
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
  },

  // Find active session
  async findActiveById(sessionId: string, executor: Executor = db) {
    const [activeSession] = await executor
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
      .limit(1);

    return activeSession ?? null;
  },

  // Find active session by refresh token hash
  async findActiveByRefreshTokenHash(refreshTokenHash: string, executor: Executor = db) {
    const [activeSession] = await executor
      .select()
      .from(sessions)
      .where(and(eq(sessions.refreshTokenHash, refreshTokenHash), isNull(sessions.revokedAt)))
      .limit(1);

    return activeSession ?? null;
  },

  // Find all active sessions for a user
  async findManyByUserId(
    authUserId: string,
    queryParams: IListSessionsQuery,
    executor: Executor = db
  ) {
    const { status, sortBy, sortOrder, limit, page } = queryParams;
    const offset = (page - 1) * limit;

    const statusCondition = (() => {
      switch (status) {
        case "active":
          return and(isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()));
        case "revoked":
          return isNotNull(sessions.revokedAt);
        case "expired":
          return and(isNull(sessions.revokedAt), lte(sessions.expiresAt, new Date()));
      }
    })();

    const whereCondition = and(eq(sessions.authUserId, authUserId), statusCondition);

    const sortColumnMap = {
      lastUsedAt: sessions.lastUsedAt,
    } as const;

    const sortColumn = sortColumnMap[sortBy];
    const orderFn = sortOrder === "asc" ? asc : desc;

    const [rows, countResult] = await Promise.all([
      executor
        .select({
          id: sessions.id,
          deviceType: sessions.deviceType,
          deviceOs: sessions.deviceOs,
          deviceBrowser: sessions.deviceBrowser,
          location: sessions.location,
          ipAddress: sessions.ipAddress,
          lastUsedAt: sessions.lastUsedAt,
          expiresAt: sessions.expiresAt,
          createdAt: sessions.createdAt,
        })
        .from(sessions)
        .where(whereCondition)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset(offset),

      executor
        .select({ count: sql<number>`count(*)::int` })
        .from(sessions)
        .where(whereCondition),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      sessions: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
