import { requireAuth } from "@/middlewares/requireAuth.js";
import { validateRequest } from "@/middlewares/validateRequest.js";
import { Router } from "express";
import { createProposalSchema, listproposalsSchema } from "./proposals.validation.js";
import { asyncBodyHandler, asyncQueryHandler } from "@/utils/asyncHandler.js";
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
