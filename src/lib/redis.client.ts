import { createClient, type RedisClientType } from "redis";
import { redisConfig } from "@/config/index.js";
import { AppError } from "@/errors/index.js";

const isTLS = redisConfig.redisUrl.startsWith("rediss://");

const reconnectStrategy = (retries: number) => {
  if (retries > 10) {
    console.error("Redis: max reconnection attempts reached");
    throw AppError.internalServerError("Redis max retries exceeded");
  }
  const delay = Math.min(retries * 50, 3000);
  console.warn(`Redis: reconnecting in ${String(delay)}ms (attempt ${String(retries)})`);
  return delay;
};

const client: RedisClientType = createClient({
  url: redisConfig.redisUrl,
  socket: isTLS
    ? {
        tls: true,
        reconnectStrategy,
        connectTimeout: 10_000,
      }
    : {
        reconnectStrategy,
        connectTimeout: 10_000,
      },
});

// Event listeners for Redis client events
client.on("error", (err: Error) => {
  console.error("Redis client error:", err.message);
});

client.on("connect", () => {
  console.info(`Redis: connecting (${isTLS ? "TLS" : "plain"})...`);
});

client.on("ready", () => {
  console.info("Redis: ready ✓");
});

client.on("reconnecting", () => {
  console.warn("Redis: reconnecting...");
});

client.on("end", () => {
  console.info("Redis: connection closed");
});

export const redisClient = client;
