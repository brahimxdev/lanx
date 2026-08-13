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
import { sql } from "drizzle-orm";

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

export const professionSourceEnum = pgEnum("profession_source_enum", ["seed", "admin"]);

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
  (pgTable) => [
    uniqueIndex("professions_slug_unique").on(pgTable.slug),
    uniqueIndex("professions_name_unique").on(sql`lower(${pgTable.name})`),
    index("idx_professions_name").on(pgTable.name),
  ]
);
