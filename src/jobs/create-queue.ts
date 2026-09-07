import { Queue, type QueueOptions } from "bullmq";
import { jobsRedisConnection } from "./connection.js";
import { isQueueRegistered, registerQueue } from "./registry.js";
import type { QueueName } from "./queue-names.js";
import { DEFAULT_JOB_OPTIONS } from "./retry-policy.js";

export const createQueue = <DataType, ReturnType = void>(
  name: QueueName,
  options?: Omit<QueueOptions, "connection">
): Queue<DataType, ReturnType> => {
  if (isQueueRegistered(name)) {
    throw new Error(
      `Queue "${name}" already created - reuse the existing instance instead of calling createQueue again.`
    );
  }

  const queue = new Queue<DataType, ReturnType>(name, {
    connection: jobsRedisConnection,
    ...options,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      ...options?.defaultJobOptions,
    },
  });

  registerQueue(queue);
  return queue;
};
