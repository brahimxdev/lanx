import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  pgEnum,
  decimal,
  char,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { authUsers, clients } from "@/db/schema/index.js";
import { sql } from "drizzle-orm";

// proposal status
export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "changes_requested",
  "declined",
  "expired",
  "cancelled",
]);

// discount type
export const discountTypeEnum = pgEnum("discount_type", ["fixed", "percentage"]);

// proposals table
export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: proposalStatusEnum("status").notNull().default("draft"),
    currencyCode: char("currency_code", { length: 3 }).notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    publicTokenHash: text("public_token_hash"),

    subTotal: decimal("sub_total", { precision: 10, scale: 2 }).notNull().default("0.00"),
    discountType: discountTypeEnum("discount_type"),
    discountFixedValue: decimal("discount_fixed_value", { precision: 10, scale: 2 }),
    discountPercentageValue: decimal("discount_percentage_value", { precision: 5, scale: 2 }),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    changesRequestedAt: timestamp("changes_requested_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    cancelledAt: timestamp("canelled_at", { withTimezone: true }),
  },

  // columns constraints and indexes
  (pgTable) => [
    index("idx_proposals_auth_user_id").on(pgTable.authUserId),
    index("idx_proposals_client_id").on(pgTable.clientId),
    index("idx_proposals_status").on(pgTable.status),
    uniqueIndex("proposals_public_token_hash_unique").on(pgTable.publicTokenHash),

    // sub total check
    check("sub_total_check", sql`${pgTable.subTotal} >= 0.00`),

    // total amount check
    check("total_amount_check", sql`${pgTable.totalAmount} >= 0.00`),

    // discount checks
    check(
      "discount_value_exclusivity_check",
      sql`(${pgTable.discountType} = 'fixed'
             AND ${pgTable.discountFixedValue} IS NOT NULL
             AND ${pgTable.discountPercentageValue} IS NULL)
          OR (${pgTable.discountType} = 'percentage'
             AND ${pgTable.discountPercentageValue} IS NOT NULL
             AND ${pgTable.discountFixedValue} IS NULL)
          OR (${pgTable.discountType} IS NULL
             AND ${pgTable.discountFixedValue} IS NULL
             AND ${pgTable.discountPercentageValue} IS NULL)`
    ),

    // discount amount presence check
    check(
      "discount_amount_presence_check",
      sql`(${pgTable.discountType} IS NULL AND ${pgTable.discountAmount} IS NULL)
          OR (${pgTable.discountType} IS NOT NULL AND ${pgTable.discountAmount} IS NOT NULL)`
    ),

    // discount fixed value check
    check(
      "discount_fixed_value_check",
      sql`${pgTable.discountFixedValue} IS NULL
          OR (${pgTable.discountFixedValue} >= 0.00 AND ${pgTable.discountFixedValue} <= ${pgTable.subTotal})`
    ),

    // discount percentage value check'
    check(
      "discount_percentage_value_check",
      sql`${pgTable.discountPercentageValue} IS NULL
          OR (${pgTable.discountPercentageValue} >= 0.00 AND ${pgTable.discountPercentageValue} <= 100.00)`
    ),

    // discount amount check
    check(
      "discount_amount_check",
      sql`${pgTable.discountAmount} IS NULL
          OR (${pgTable.discountAmount} >= 0.00 AND ${pgTable.discountAmount} <= ${pgTable.subTotal})`
    ),

    // discount amount fixed consistency check
    check(
      "discount_amount_fixed_consistency_check",
      sql`${pgTable.discountType} IS DISTINCT FROM 'fixed'
          OR ${pgTable.discountAmount} = ${pgTable.discountFixedValue}`
    ),

    // total amount consistency check
    check(
      "total_amount_consistency_check",
      sql`${pgTable.totalAmount} = ${pgTable.subTotal} - COALESCE(${pgTable.discountAmount}, 0.00)`
    ),
  ]
);

// proposal line items table
export const proposalLineItems = pgTable(
  "proposal_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "restrict" }),

    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1.00"),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default("0.00"),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },

  // columns constraints and indexes
  (pgTable) => [
    check("quantity_check", sql`${pgTable.quantity} >= 1.00`),
    check("unit_price_check", sql`${pgTable.unitPrice} >= 0.00`),
    check("total_amount_check", sql`${pgTable.totalAmount} >= 0.00`),
    check(
      "line_item_total_amount_consistency_check",
      sql`${pgTable.totalAmount} = ROUND(${pgTable.quantity} * ${pgTable.unitPrice}, 2)`
    ),
  ]
);
