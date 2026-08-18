import type { ClientService } from "./clients.service.js";
import type { IAuthenticatedUser } from "@/modules/auth/auth.types.js";
import type { TypedBodyRequest, TypedRequest } from "@/types/typed-request.js";
import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type { ICreateClient } from "./clients.validation.js";
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
}
