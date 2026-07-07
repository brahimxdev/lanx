import "./src/config/load-env.js";
import { defineConfig } from "drizzle-kit";
import { dbEnv } from "./src/config/db-env.js";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbEnv.DATABASE_URL,
  },
});
