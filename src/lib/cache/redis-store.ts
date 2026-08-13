import { redisClient } from "@/lib/redis.client.js";

export class RedisJsonStore {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await redisClient.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      console.error(`RedisJsonStore.get failed for key "${key}":`, err);
      return null; // fail open — treat as cache miss
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await redisClient.set(key, JSON.stringify(value), {
        expiration: { type: "EX", value: ttlSeconds },
      });
    } catch (err) {
      console.error(`RedisJsonStore.set failed for key "${key}":`, err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.error(`RedisJsonStore.del failed for key "${key}":`, err);
    }
  }
}

export const redisJsonStore = new RedisJsonStore();
