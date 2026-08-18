import { isUniqueViolation } from "@/utils/isUniqueViolation.js";
import type { ICreateClient, IListClients } from "./clients.validation.js";
import type { IClientRepo, Client } from "./clientsRepo.Interface.js";
import { AppError } from "@/errors/AppError.js";
import { ErrorCode } from "@/errors/error-codes.js";

export class ClientService {
  constructor(private readonly clientRepo: IClientRepo) {}

  // Create new client
  async createClient(input: ICreateClient, authUserId: string): Promise<{ newClient: Client }> {
    try {
      const newClient = await this.clientRepo.createClient(input, authUserId);

      return { newClient };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw AppError.conflict(
          "A client with the same email already exist",
          ErrorCode.ALREADY_EXISTS
        );
      }

      throw error;
    }
  }

  // List clients for a freelancer with pagination, sorting, and filtration
  async listClients(queryParams: IListClients, authUserId: string) {
    const { data, meta } = await this.clientRepo.findManyByAuthUserId(queryParams, authUserId);

    return { data, meta };
  }

  // Get client by ID for a freelancer
  async getClientById(clientId: string, authUserId: string) {
    const client = await this.clientRepo.findById(clientId, authUserId);

    if (!client) {
      throw AppError.notFound("Client not found", ErrorCode.NOT_FOUND);
    }

    return { client };
  }
}
