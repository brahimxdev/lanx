import { Worker, type WorkerOptions, type Processor } from "bullmq";
import { jobsRedisConnection } from "@/jobs/connection.js";
import { isWorkerRegistered, registerWorker } from "@/jobs/registry.js";
import type { QueueName } from "@/jobs/queue-names.js";
import { consoleFailureNotifier, type IJobFailureNotifier } from "./failure-notifier.js";
import { handleExhaustedFailure } from "./failure-handler.js";

interface ICreateWorkerExtraOptions {
  notifier?: IJobFailureNotifier;
}

export const createWorker = <DataType, ReturnType = void>(
  name: QueueName,
  processor: Processor<DataType, ReturnType>,
  options?: Omit<WorkerOptions, "connection"> & ICreateWorkerExtraOptions
): Worker<DataType, ReturnType> => {
  if (isWorkerRegistered(name)) {
    throw new Error(
      `Worker "${name}" already created - reuse the existing instance instead of calling createWorker again.`
    );
  }

  const { notifier = consoleFailureNotifier, ...workerOptions } = options ?? {};

  const worker = new Worker<DataType, ReturnType>(name, processor, {
    connection: jobsRedisConnection,
    lockDuration: 60_000,
    maxStalledCount: 2,
    ...workerOptions,
  });

  worker.on("completed", (job) => {
    console.info(`Job ${String(job.id)} completed`);
  });

  worker.on("failed", (job, err) => {
    if (!job) {
      console.error(`Worker error on queue "${name}" — no job context:`, err.message);
      return;
    }

    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts ?? 1;
    const exhausted = attemptsMade >= maxAttempts;

    if (!exhausted) {
      console.warn(
        `Job ${String(job.id)} on "${name}" failed attempt ${String(attemptsMade)}/${String(maxAttempts)}, retrying:`,
        err.message
      );
      return;
    }

    handleExhaustedFailure({ job, err, queueName: name, attemptsMade, notifier }).catch(
      (handlerErr: unknown) => {
        console.error(
          `Failure handler itself failed for job ${String(job.id)}:`,
          handlerErr instanceof Error ? handlerErr.message : String(handlerErr)
        );
      }
    );
  });

  worker.on("error", (err) => {
    console.error(`Worker error on queue "${name}":`, err.message);
  });

  registerWorker(worker);
  return worker;
};
