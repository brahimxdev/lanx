import "@/config/load-env.js";

import { randomUUID } from "node:crypto";
import { QueueEvents, type Job } from "bullmq";
import { createQueue } from "@/jobs/create-queue.js";
import { createWorker } from "@/jobs/create-worker.js";
import { closeAllJobs } from "@/jobs/registry.js";
import { closeJobsRedisConnection, jobsRedisConnection } from "@/jobs/connection.js";
import { getJobFailureByJobId, deleteJobFailure } from "@/jobs/failure.repo.js";
import { QUEUE_NAMES } from "@/jobs/queue-names.js";

type SmokeMode = "success" | "retry-once" | "always-fail";
interface SmokeJobData {
  mode: SmokeMode;
}

const QUEUE_NAME = QUEUE_NAMES.SMOKE_TEST;

/**
 * attemptsMade is 1 on the processor's first invocation, 2 on the first
 * retry, and so on — throwing only when attemptsMade <= 1 means "fail the
 * first attempt, succeed on the retry" without needing external state.
 */
// eslint-disable-next-line @typescript-eslint/require-await
const processor = async (job: Job<SmokeJobData>): Promise<void> => {
  if (job.data.mode === "always-fail") {
    throw new Error("smoke-test: intentional permanent failure");
  }
  if (job.data.mode === "retry-once" && job.attemptsMade === 0) {
    console.info(
      `  (attempt ${String(job.attemptsMade)} — failing intentionally to trigger retry)`
    );
    throw new Error("smoke-test: intentional single failure to verify retry");
  }
};

const waitForCondition = async (
  check: () => Promise<boolean>,
  { timeoutMs = 5000, intervalMs = 200 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
};

async function runSmokeTest(): Promise<void> {
  console.info("=== Background jobs smoke test ===");

  const queue = createQueue<SmokeJobData>(QUEUE_NAME, {
    // Fast, fixed backoff for the smoke test itself — this isn't re-testing
    // whether ticket 3's exponential math is correct, it's testing whether
    // the pipeline moves data end-to-end. Slow retries would just make this
    // script slow without verifying anything extra.
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 200 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  });

  const queueEvents = new QueueEvents(QUEUE_NAME, { connection: jobsRedisConnection.duplicate() });
  await queueEvents.waitUntilReady();

  createWorker<SmokeJobData>(QUEUE_NAME, processor);

  let passed = 0;
  let failed = 0;

  try {
    const job = await queue.add(
      "smoke-success",
      { mode: "success" },
      { jobId: `smoke-success-${randomUUID()}` }
    );
    await job.waitUntilFinished(queueEvents, 5000);
    console.info("[PASS] happy path: job completed on first attempt");
    passed++;
  } catch (err) {
    console.error("[FAIL] happy path:", (err as Error).message);
    failed++;
  }

  try {
    const job = await queue.add(
      "smoke-retry",
      { mode: "retry-once" },
      { jobId: `smoke-retry-${randomUUID()}` }
    );
    await job.waitUntilFinished(queueEvents, 5000);
    console.info("[PASS] retry path: job failed once, then succeeded on retry");
    passed++;
  } catch (err) {
    console.error("[FAIL] retry path:", (err as Error).message);
    failed++;
  }

  {
    const jobId = `smoke-fail-${randomUUID()}`;
    try {
      const job = await queue.add("smoke-fail", { mode: "always-fail" }, { jobId });
      await job.waitUntilFinished(queueEvents, 5000);
      console.error("[FAIL] failure path: job completed but should have exhausted retries");
      failed++;
    } catch {
      // Expected — waitUntilFinished rejects once the job lands in "failed".
      // That confirms Redis state only; ticket 4's Postgres write happens
      // asynchronously from the 'failed' listener and isn't awaited by
      // BullMQ, so we poll briefly instead of checking once and racing it.
      const found = await waitForCondition(async () => {
        const row = await getJobFailureByJobId(QUEUE_NAME, jobId);
        return row !== null;
      });

      if (found) {
        console.info(
          "[PASS] failure path: job exhausted retries and was persisted to job_failures"
        );
        passed++;
        await deleteJobFailure(QUEUE_NAME, jobId); // synthetic row — remove so it doesn't pollute real failure history
      } else {
        console.error(
          "[FAIL] failure path: job exhausted retries but no job_failures row was found"
        );
        failed++;
      }
    }
  }

  await queueEvents.close();
  await queue.obliterate({ force: true }); // wipe smoke-test job data from Redis
  await closeAllJobs();
  await closeJobsRedisConnection();

  console.info(`=== Smoke test complete: ${String(passed)} passed, ${String(failed)} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runSmokeTest().catch((err: unknown) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
