import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { authUsers } from "@/db/schema/index.js";
import { sql } from "drizzle-orm";

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    companyName: text("company_name"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // columns constraints and indexes
  (pgTable) => [
    {
      authUserEmailUnique: uniqueIndex("idx_clients_auth_user_id_email")
        .on(pgTable.authUserId, pgTable.email)
        .where(sql`${pgTable.archivedAt} IS NULL`),
      idxAuthUserId: index("idx_clients_auth_user_id").on(pgTable.authUserId),
    },
  ]
);
