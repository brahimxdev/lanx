import { z } from "zod";
import { parseEnv } from "./env-parser.js";

const dbEnvSchema = z.object({
  DATABASE_URL: z.url(),
});

export const dbEnv = parseEnv(dbEnvSchema, "database");
