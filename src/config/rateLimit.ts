export type RateLimitAlgorithm = "fixed-window" | "sliding-window-log";

export interface RateLimitRule {
  algorithm: RateLimitAlgorithm;
  limit: number;
  windowSeconds: number;
  keyBy: "ip" | "userId";
}

export const rateLimitRules: Record<string, RateLimitRule> = {
  // general API traffic — cheap, approximate is fine
  default: {
    algorithm: "fixed-window",
    limit: 100,
    windowSeconds: 60,
    keyBy: "userId",
  },

  // brute-force-sensitive endpoints - needs precision
  login: {
    algorithm: "sliding-window-log",
    limit: 5,
    windowSeconds: 60,
    keyBy: "ip", // no userId yet at login time
  },

  passwordReset: {
    algorithm: "sliding-window-log",
    limit: 3,
    windowSeconds: 300,
    keyBy: "ip",
  },
};
