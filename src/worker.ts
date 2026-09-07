import { closeAllJobs } from "./jobs/index.js";
import { closeJobsRedisConnection } from "./jobs/connection.js";
import { startAllWorkers } from "./jobs/startWorkers.js";

const shutDown = async (signal: string) => {
  console.info(`${signal} received - shutting down workers gracefully`);

  try {
    await closeAllJobs();

    await closeJobsRedisConnection();

    console.info("Workers shut down successfully");
  } catch (err) {
    console.error("Error shutting down workers:", err);
  }

  process.exit(0);
};

process.on("SIGTERM", () => void shutDown("SIGTERM"));
process.on("SIGINT", () => void shutDown("SIGINT"));

// eslint-disable-next-line @typescript-eslint/require-await
const startWorker = async () => {
  console.info("Starting background workers");

  startAllWorkers();

  console.info("Background workers started");
};

startWorker().catch((err: unknown) => {
  console.error("Failed to start workers:", err);
  process.exit(1);
});
