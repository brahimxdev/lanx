import type { Executor } from "@/db/executor.js";
import type { clients } from "@/db/schema/index.js";

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type CreateClientInput = Pick<
  NewClient,
  "firstName" | "lastName" | "email" | "companyName" | "notes"
>;

export interface IClientRepo {
  createClient(data: CreateClientInput, authUserId: string, executor?: Executor): Promise<Client>;
}
