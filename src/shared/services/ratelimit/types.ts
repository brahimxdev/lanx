import type { RateLimitRule } from "@/config/rateLimit.js";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitStrategy {
  check(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}
