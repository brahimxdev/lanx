import { and, desc, eq } from "drizzle-orm";
import { jobFailures } from "@/db/schema/job-failures.schema.js";
import { db } from "@/db/client.js";

interface IRecordJobFailureInput {
  queueName: string;
  jobId: string;
  jobName: string;
  payload: unknown;
  errorMessage: string;
  errorStack?: string;
  attemptsMade: number;
}

export const recordJobFailure = async (input: IRecordJobFailureInput): Promise<void> => {
  await db
    .insert(jobFailures)
    .values(input)
    .onConflictDoNothing({ target: [jobFailures.queueName, jobFailures.jobId] });
};

export const getRecentJobFailures = async (limit = 50) => {
  return db.select().from(jobFailures).orderBy(desc(jobFailures.failedAt)).limit(limit);
};

export const getJobFailureByJobId = async (queueName: string, jobId: string) => {
  const rows = await db
    .select()
    .from(jobFailures)
    .where(and(eq(jobFailures.queueName, queueName), eq(jobFailures.jobId, jobId)))
    .limit(1);
  return rows[0] ?? null;
};

export const deleteJobFailure = async (queueName: string, jobId: string): Promise<void> => {
  await db
    .delete(jobFailures)
    .where(and(eq(jobFailures.queueName, queueName), eq(jobFailures.jobId, jobId)));
};
