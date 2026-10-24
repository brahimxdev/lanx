import type {
  TypedBodyRequest,
  TypedParamsRequest,
  TypedQueryRequest,
  TypedRequest,
} from "@/types/typed-request.js";
import type { ProposalService } from "./proposals.service.js";
import { AppError, ErrorCode, HttpStatus } from "@/errors/index.js";
import type { IAuthenticatedUser } from "@/modules/auth/auth.types.js";
import type { ICreateProposal, IGetProposal, IListProposals } from "./proposals.validation.js";
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

  // list proposals - (need auth access)
  listProposals = async (req: TypedQueryRequest<IListProposals>, res: Response) => {
    this.assertUser(req);

    const authUserId = req.user.id;

    const input = req.validated.query;

    // Service layer to handle logic
    const { data: proposals, meta } = await this.proposalService.listProposals(input, authUserId);

    res.status(HttpStatus.OK).json({
      status: true,
      data: { proposals, pagination: meta },
    });
  };

  // Get proposal by ID for a freelancer
  getProposalById = async (req: TypedParamsRequest<IGetProposal>, res: Response) => {
    //* Validation middleware already validated data!
    this.assertUser(req);

    const authUserId = req.user.id;
    const { proposalId } = req.validated.params;

    // Service layer to handle logic

    const { proposal } = await this.proposalService.getProposalById(proposalId, authUserId);

    res.status(HttpStatus.OK).json({
      status: true,
      data: { proposal },
    });
  };
}
