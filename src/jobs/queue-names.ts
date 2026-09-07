// Central registry of queue names
export const QUEUE_NAMES = {
  SMOKE_TEST: "smoke-test",
  EMAIL: "email",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
