import type { Request, Response, NextFunction } from "express";
import { rateLimitRules, type RateLimitRule, type RateLimitRuleName } from "@/config/rateLimit.js";
import { rateLimiterService } from "@/shared/services/ratelimit/rateLimiter.service.js";
import { RateLimitError } from "@/errors/RateLimitError.js";

function buildKey(req: Request, rule: RateLimitRule, ruleName: string): string {
  const ip = req.ip ?? "unknown";
  const identifier = rule.keyBy === "userId" ? (req.user?.id ?? ip) : ip;

  return `ratelimit:${ruleName}:${identifier}`;
}

export function rateLimiter(ruleName: RateLimitRuleName) {
  const rule = rateLimitRules[ruleName];

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = buildKey(req, rule, ruleName);
    const result = await rateLimiterService.check(key, rule);

    res.setHeader("X-RateLimit-Limit", result.limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);

    if (!result.allowed) {
      res.setHeader("X-RateLimit-Retry-After", result.retryAfterSeconds);
      next(new RateLimitError(result.retryAfterSeconds));
      return;
    }

    next();
    return;
  };
}
