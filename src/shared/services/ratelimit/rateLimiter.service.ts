import type { RateLimitAlgorithm, RateLimitRule } from "@/config/rateLimit.js";
import { FixedWindowStrategy } from "./strategies/fixedWindow.strategy.js";
import { SlidingWindowLogStrategy } from "./strategies/slidingWindowLog.strategy.js";
import type { RateLimitStrategy, RateLimitResult } from "./types.js";

class RateLimiterService {
  private strategies: Record<RateLimitAlgorithm, RateLimitStrategy> = {
    "fixed-window": new FixedWindowStrategy(),
    "sliding-window-log": new SlidingWindowLogStrategy(),
  };

  async check(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    try {
      return await this.strategies[rule.algorithm].check(key, rule);
    } catch (err) {
      // FAIL OPEN — a Redis/script failure must never take down login.
      console.error("[rateLimiter] check failed, failing open", {
        key,
        algorithm: rule.algorithm,
        error: err instanceof Error ? err.message : err,
      });

      return {
        allowed: true,
        limit: rule.limit,
        remaining: rule.limit,
        retryAfterSeconds: 0,
      };
    }
  }
}

export const rateLimiterService = new RateLimiterService();
