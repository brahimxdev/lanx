import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { dbEnv } from "../config/db-env.js";

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
  maxUses: 7500,
  connectionString: dbEnv.DATABASE_URL,
});

export const db = drizzle({ client: pool });
