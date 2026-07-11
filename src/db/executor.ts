import type { db } from "./client.js";

type Transaction = Parameters<typeof db.transaction>[0];
export type Executor = typeof db | Parameters<Transaction>[0];
