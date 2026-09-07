import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const jobFailures = pgTable(
  "job_failures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    queueName: text("queue_name").notNull(),
    jobId: text("job_id").notNull(),
    jobName: text("job_name").notNull(),
    payload: jsonb("payload").notNull(),
    errorMessage: text("error_message").notNull(),
    errorStack: text("error_stack"),
    attemptsMade: integer("attempts_made").notNull(),
    failedAt: timestamp("failed_at", { withTimezone: true }).notNull().defaultNow(),
  }, // columns constraints and indexes
  (pgTable) => [
    index("idx_job_failures_queue_name").on(pgTable.queueName),
    uniqueIndex("idx_job_failures_queue_job_unique").on(pgTable.queueName, pgTable.jobId),
  ]
);
