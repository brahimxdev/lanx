import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  char,
  pgEnum,
} from "drizzle-orm/pg-core";
import { authUsers } from "@/db/schema/index.js";

export const currencies = pgTable("currencies", {
  code: char("code", { length: 3 }).primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
});

export const countries = pgTable("countries", {
  code: char("code", { length: 2 }).primaryKey(),
  name: text("name").notNull(),
  defaultCurrencyCode: char("default_currency_code", { length: 3 }).references(
    () => currencies.code,
    { onDelete: "restrict" }
  ),
});

export const professionSourceEnum = pgEnum("profession_source_enum", ["seed", "admin", "user"]);

export const professions = pgTable(
  "professions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    source: professionSourceEnum("source").notNull().default("seed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // columns constraints and indexes
  (pgTable) => [uniqueIndex("professions_slug_unique").on(pgTable.slug)]
);

// profiles table
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    businessName: text("business_name"),

    logoUrl: text("logo_url"),

    professionId: uuid("profession_id").references(() => professions.id, {
      onDelete: "set null",
    }),

    countryCode: char("country_code", { length: 2 }).references(() => countries.code, {
      onDelete: "restrict",
    }),

    currencyCode: char("currency_code", { length: 3 }).references(() => currencies.code, {
      onDelete: "restrict",
    }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (pgTable) => [
    uniqueIndex("profiles_auth_user_id_unique").on(pgTable.authUserId),
    index("idx_profiles_profession_id").on(pgTable.professionId),
    index("idx_profiles_country_code").on(pgTable.countryCode),
  ]
);
