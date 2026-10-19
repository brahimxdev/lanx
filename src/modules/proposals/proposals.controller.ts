import type { TypedBodyRequest, TypedRequest } from "@/types/typed-request.js";
import type { ProposalService } from "./proposals.service.js";
import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type { IAuthenticatedUser } from "@/modules/auth/auth.types.js";
import type { ICreateProposal } from "./proposals.validation.js";
import type { Response } from "express";

export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  private assertUser(
    req: TypedRequest
  ): asserts req is TypedRequest & { user: IAuthenticatedUser } {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED);
    }
  }

  // create proposal - (need auth access)
  createProposal = async (req: TypedBodyRequest<ICreateProposal>, res: Response) => {
    //* Validation middleware already validated data!

    this.assertUser(req);

    const authUserId = req.user.id;

    const input = req.validated.body;

    // Service layer to handle logic
    const { newProposal } = await this.proposalService.createProposal(input, authUserId);

    res.status(HttpStatus.Created).json({
      status: true,
      data: { newProposal },
    });
  };
}
