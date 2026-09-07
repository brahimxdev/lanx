import type { Queue, Worker } from "bullmq";

const queues: Queue[] = [];
const workers: Worker[] = [];

export const registerQueue = (queue: Queue): void => {
  queues.push(queue);
};

export const registerWorker = (worker: Worker): void => {
  workers.push(worker);
};

export const isQueueRegistered = (name: string): boolean => {
  return queues.some((queue) => queue.name === name);
};

export const isWorkerRegistered = (name: string): boolean => {
  return workers.some((worker) => worker.name === name);
};

export const closeAllJobs = async (): Promise<void> => {
  await Promise.all(workers.map((worker) => worker.close()));
  await Promise.all(queues.map((queue) => queue.close()));
};
