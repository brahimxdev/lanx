import fs from "fs";
import path from "path";
import type { RateLimitRule } from "@/config/rateLimit.js";
import { redisClient } from "@/lib/redis.client.js";

const fixedWindowScript = fs.readFileSync(
  path.join(__dirname, "../redis/scripts/fixedWindow.lua"),
  "utf-8"
);
const slidingWindowScript = fs.readFileSync(
  path.join(__dirname, "../redis/scripts/slidingWindowLog.lua"),
  "utf-8"
);

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

class RateLimiterService {
  async check(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    try {
      if (rule.algorithm === "fixed-window") {
        return await this.checkFixedWindow(key, rule);
      }
      return await this.checkSlidingWindowLog(key, rule);
    } catch (err) {
      // FAIL OPEN — same principle as blocklistSession: a Redis outage
      // must never be interpreted as "block everyone." Log it loudly
      // so it's visible in monitoring, but let the request through.
      console.error("[rateLimiter] Redis unavailable, failing open:", err);
      return {
        allowed: true,
        limit: rule.limit,
        remaining: rule.limit,
        retryAfterSeconds: 0,
      };
    }
  }

  private async checkFixedWindow(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const [allowed, current, ttl] = (await redisClient.eval(fixedWindowScript, {
      keys: [key],
      arguments: [String(rule.windowSeconds), String(rule.limit)],
    })) as [number, number, number];

    return {
      allowed: allowed === 1,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - current),
      retryAfterSeconds: ttl,
    };
  }

  private async checkSlidingWindowLog(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = rule.windowSeconds * 1000;

    const [allowed, count, retryAfterMs] = (await redisClient.eval(slidingWindowScript, {
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

export const rateLimiterService = new RateLimiterService();
