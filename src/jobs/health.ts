import { jobsRedisConnection } from "@/jobs/connection.js";

export const isJobsRedisHealthy = async (): Promise<boolean> => {
  try {
    await jobsRedisConnection.ping();
    return true;
  } catch {
    return false;
  }
};
