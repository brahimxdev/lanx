import { requireAuth } from "@/middlewares/requireAuth.js";
import { validateRequest } from "@/middlewares/validateRequest.js";
import { Router } from "express";
import {
  createProposalSchema,
  getProposalSchema,
  listproposalsSchema,
  updateProposalSchema,
} from "./proposals.validation.js";
import {
  asyncBodyHandler,
  asyncParamsAndBodyHandler,
  asyncParamsHandler,
  asyncQueryHandler,
} from "@/utils/asyncHandler.js";
import { proposalController } from "./proposals.module.js";

export const proposalsRouter = Router();

//* base url - /api/v1/proposals

// apply requireAuth to all proposals routes
proposalsRouter.use(requireAuth);

// Route for creating proposals
proposalsRouter.post(
  "/",
  validateRequest({ body: createProposalSchema }),
  asyncBodyHandler(proposalController.createProposal)
);

// Route for listing proposal
proposalsRouter.get(
  "/",
  validateRequest({ query: listproposalsSchema }),
  asyncQueryHandler(proposalController.listProposals)
);

// Route for viewing a single proposal
proposalsRouter.get(
  "/:proposalId",
  validateRequest({ params: getProposalSchema }),
  asyncParamsHandler(proposalController.getProposalById)
);

// Route for updating a single proposal
proposalsRouter.patch(
  "/:proposalId",
  validateRequest({ params: getProposalSchema, body: updateProposalSchema }),
  asyncParamsAndBodyHandler(proposalController.updateProposal)
);
