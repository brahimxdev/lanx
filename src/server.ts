import { appConfig } from "./config/index.js";
import app from "./app.js";
import { redisClient } from "@/lib/redis.client.js";

const shutDown = async (signal: string) => {
  console.info(`${signal} received - shutting down gracefully`);

  try {
    await redisClient.close();
    console.info("Redis connection closed");
  } catch (err) {
    console.error("Error closing Redis:", err);
  }

  process.exit(0);
};

process.on("SIGTERM", () => void shutDown("SIGTERM"));
process.on("SIGINT", () => void shutDown("SIGINT"));

const startServer = async () => {
  await redisClient.connect();
  app.listen(appConfig.port, () => {
    console.log(`Server running on ${appConfig.url}:${String(appConfig.port)}`);
  });
};

startServer().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
