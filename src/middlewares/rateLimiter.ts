import type { Request, Response, NextFunction } from "express";
import { rateLimiterService } from "@/shared/services/ratelimit/rateLimiter.service.js";
import { rateLimitRules, type RateLimitRule } from "@/config/rateLimit.js";

const buildKey = (req: Request, rule: RateLimitRule, ruleName: string): string => {
  const identifier =
    rule.keyBy === "userId"
      ? (req.user?.id ?? req.ip ?? "unknown") // fall back to IP if unauthenticated
      : (req.ip ?? "unknown");

  return `ratelimit:${ruleName}:${identifier}`;
};

export const rateLimiter = (ruleName: keyof typeof rateLimitRules) => {
  const rule = rateLimitRules[ruleName];

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!rule) {
      next();
      return;
    }
    const key = buildKey(req, rule, ruleName);
    const result = await rateLimiterService.check(key, rule);

    res.setHeader("X-RateLimit-Limit", result.limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);

    if (!result.allowed) {
      res.setHeader("X-RateLimit-Retry-After", result.retryAfterSeconds);
      return res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    next();
    return;
  };
};
