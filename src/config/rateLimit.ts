export type RateLimitAlgorithm = "fixed-window" | "sliding-window-log";

export interface RateLimitRule {
  algorithm: RateLimitAlgorithm;
  limit: number;
  windowSeconds: number;
  keyBy: "ip" | "userId";
}

export const rateLimitRules = {
  default: {
    algorithm: "fixed-window",
    limit: 100,
    windowSeconds: 60,
    keyBy: "userId",
  },
  login: {
    algorithm: "sliding-window-log",
    limit: 5,
    windowSeconds: 60,
    keyBy: "ip",
  },
  passwordReset: {
    algorithm: "sliding-window-log",
    limit: 3,
    windowSeconds: 300,
    keyBy: "ip",
  },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitRuleName = keyof typeof rateLimitRules;
