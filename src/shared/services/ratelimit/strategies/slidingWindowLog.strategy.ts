import fs from "fs";
import path from "path";
import { redisClient } from "@/lib/redis.client.js";
import type { RateLimitRule } from "@/config/rateLimit.js";
import type { RateLimitResult, RateLimitStrategy } from "../types.js";

const script = fs.readFileSync(path.join(__dirname, "../script/slidingWindowLog.lua"), "utf-8");

export class SlidingWindowLogStrategy implements RateLimitStrategy {
  async check(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = rule.windowSeconds * 1000;

    const [allowed, count, retryAfterMs] = (await redisClient.eval(script, {
      keys: [key],
      arguments: [String(now), String(windowMs), String(rule.limit)],
    })) as [number, number, number];

    return {
      allowed: allowed === 1,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }
}
