import { Redis } from "ioredis";
import { redisConfig } from "@/config/index.js";

const isTLS = redisConfig.jobsRedisUrl.startsWith("rediss://");

const retryStrategy = (retries: number): number => {
  const delay = Math.min(retries * 100, 5000);
  if (retries % 5 === 0) {
    console.error(`Redis (jobs): still reconnecting after ${String(retries)} attempts`);
  }
  return delay;
};

export const jobsRedisConnection = new Redis(redisConfig.jobsRedisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy,
  connectTimeout: 10_000,
  ...(isTLS ? { tls: {} } : {}),
});

jobsRedisConnection.on("error", (err: Error) => {
  console.error("Redis (jobs) client error:", err.message);
});

jobsRedisConnection.on("connect", () => {
  console.info(`Redis (jobs): connecting (${isTLS ? "TLS" : "plain"})...`);
});

jobsRedisConnection.on("ready", () => {
  console.info("Redis (jobs): ready ✓");
});

jobsRedisConnection.on("reconnecting", (delay: number) => {
  console.warn(`Redis (jobs): reconnecting in ${String(delay)}ms`);
});

jobsRedisConnection.on("end", () => {
  console.warn("Redis (jobs): connection closed");
});

export const closeJobsRedisConnection = async (): Promise<void> => {
  await jobsRedisConnection.quit();
};
