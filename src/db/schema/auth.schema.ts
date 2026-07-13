import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const confirmationTypeEnum = pgEnum("confirmation_type", [
  "sign_up",
  "change_email",
  "password_reset",
]);

// auth_users table
export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  // columns constraints and indexes
  (pgTable) => [
    uniqueIndex("auth_users_email_unique_active")
      .on(pgTable.email)
      .where(sql`${pgTable.deletedAt} IS NULL`),
  ]
);

// email_confirmations table
export const emailConfirmations = pgTable(
  "email_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    confirmationType: confirmationTypeEnum("confirmation_type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },

  // columns constraints and indexes
  (pgTable) => [
    check("attempt_count_check", sql`${pgTable.attemptCount} >= 0`),
    index("idx_email_confirmations_auth_user_id").on(pgTable.authUserId),
    index("idx_email_confirmations_expires-at").on(pgTable.expiresAt),
    uniqueIndex("one_active_confirmation")
      .on(pgTable.authUserId, pgTable.confirmationType)
      .where(sql`${pgTable.usedAt} IS NULL`),
  ]
);

// sessions table
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ipAddress: inet("ip_address"),
    location: jsonb("location"),
    userAgent: text("user_agent"),
    deviceType: text("device_type"),
    deviceOs: text("device_os"),
    deviceBrowser: text("device_browser"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // columns constraints and indexes
  (pgTable) => [
    index("idx_sessions_auth_user_id").on(pgTable.authUserId),
    index("idx_sessions_active")
      .on(pgTable.authUserId)
      .where(sql`${pgTable.revokedAt} IS NULL`),
    index("idx_sessions_expires_at").on(pgTable.expiresAt),
  ]
);
