import type { ClientService } from "./clients.service.js";
import type { IAuthenticatedUser } from "@/modules/auth/auth.types.js";
import type {
  TypedBodyRequest,
  TypedParamsRequest,
  TypedQueryRequest,
  TypedRequest,
} from "@/types/typed-request.js";
import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type {
  ICreateClient,
  IGetClient,
  IListClients,
  IUpdateClient,
} from "./clients.validation.js";
import type { Response } from "express";

export class ClientController {
  constructor(private readonly clientService: ClientService) {}
  private assertUser(
    req: TypedRequest
  ): asserts req is TypedRequest & { user: IAuthenticatedUser } {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED);
    }
  }

  // Create client - (need auth access)
  createClient = async (req: TypedBodyRequest<ICreateClient>, res: Response) => {
    //* Validation middleware already validated data!

    this.assertUser(req);

    const authUserId = req.user.id;

    const input = req.validated.body;

    // Service layer to handle logic
    const { newClient } = await this.clientService.createClient(input, authUserId);

    res.status(HttpStatus.Created).json({
      status: true,
      data: { newClient },
    });
  };

  // List clients for a freelancer with pagination, sorting, and filtration
  listClients = async (req: TypedQueryRequest<IListClients>, res: Response) => {
    //* Validation middleware already validated data!
    this.assertUser(req);

    const authUserId = req.user.id;

    const input = req.validated.query;

    // Service layer to handle logic
    const { data: clients, meta } = await this.clientService.listClients(input, authUserId);

    res.status(HttpStatus.OK).json({
      status: true,
      data: { clients, pagination: meta },
    });
  };

  // Get client by ID for a freelancer
  getClientById = async (req: TypedParamsRequest<IGetClient>, res: Response) => {
    //* Validation middleware already validated data!
    this.assertUser(req);

    const authUserId = req.user.id;
    const { clientId } = req.validated.params;

    // Service layer to handle logic
    const { client } = await this.clientService.getClientById(clientId, authUserId);

    res.status(HttpStatus.OK).json({
      status: true,
      data: { client },
    });
  };

  // Update a client by ID for a freelancer

  updateClient = async (req: TypedRequest<unknown, IUpdateClient, IGetClient>, res: Response) => {
    //* Validation middleware already validated data!
    this.assertUser(req);

    const authUserId = req.user.id;
    const { clientId } = req.validated.params;
    const input = req.validated.body;

    // Service layer to handle logic
    const { clientRecord } = await this.clientService.updateClient(input, clientId, authUserId);

    res.status(HttpStatus.OK).json({
      status: true,
      data: { clientRecord },
    });
  };
}
