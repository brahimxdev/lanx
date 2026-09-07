import type { Job } from "bullmq";
import { recordJobFailure } from "@/jobs/failure.repo.js";
import type { IJobFailureNotifier } from "@/jobs/failure-notifier.js";

interface HandleExhaustedFailureInput {
  job: Job;
  err: Error;
  queueName: string;
  attemptsMade: number;
  notifier: IJobFailureNotifier;
}

/**
 * Runs once a job has exhausted every retry attempt. Persistence and notification run independently via
 * allSettled — a notifier outage must not prevent the DB record from being
 * written, and a DB hiccup must not suppress the notification.
 */
export const handleExhaustedFailure = async ({
  job,
  err,
  queueName,
  attemptsMade,
  notifier,
}: HandleExhaustedFailureInput): Promise<void> => {
  const summary = {
    queueName,
    jobId: String(job.id),
    jobName: job.name,
    errorMessage: err.message,
    attemptsMade,
  };

  const errorStack = err.stack ?? "No stack trace available";

  const results = await Promise.allSettled([
    recordJobFailure({ ...summary, payload: job.data, errorStack }),
    Promise.resolve(notifier.notify(summary)),
  ]);

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const stage = i === 0 ? "persist failure record" : "notify";
      console.error(
        `Failed to ${stage} for job ${String(job.id)} on "${queueName}":`,
        result.reason
      );
    }
  });
};
