import type { Executor } from "@/db/executor.js";
import type { IClientRepo, Client, CreateClientInput } from "./clientsRepo.Interface.js";
import { db } from "@/db/client.js";
import { clients } from "@/db/schema/index.js";
import { AppError } from "@/errors/AppError.js";

export class ClientRepo implements IClientRepo {
  // Create client record, if email already exist don't duplicate per freelancer
  async createClient(
    data: CreateClientInput,
    authUserId: string,
    executor: Executor = db
  ): Promise<Client> {
    const [clientRecord] = await executor
      .insert(clients)
      .values({ ...data, authUserId })
      .returning();

    if (!clientRecord) {
      throw AppError.internalServerError("Failed to create client");
    }
    return clientRecord;
  }
}

export const clientRepo = new ClientRepo();
