import type { JobsOptions } from "bullmq";

// Baseline retry/retention policy applied to every queue via createQueue().
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
  // Bounded retention: without this, every job ever run accumulates in
  // Redis forever. Completed jobs are low-value after a short window;
  // failed jobs are kept longer since they matter for debugging
  removeOnComplete: {
    count: 1000,
    age: 24 * 60 * 60, // 1 day, in seconds
  },
  removeOnFail: {
    count: 5000,
    age: 7 * 24 * 60 * 60, // 7 days, in seconds
  },
};
