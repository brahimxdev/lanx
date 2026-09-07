import type { Request, Response } from "express";
import { isJobsRedisHealthy } from "@/jobs/health.js";

export class HealthController {
  // eslint-disable-next-line @typescript-eslint/require-await
  live = async (_req: Request, res: Response) => {
    res.status(200).json({ status: "alive" });
  };

  ready = async (_req: Request, res: Response) => {
    const checks = {
      jobsRedis: await isJobsRedisHealthy(),
    };

    const allHealthy = Object.values(checks).every(Boolean);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "ready" : "not_ready",
      checks,
    });
  };
}
