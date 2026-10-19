import { clientRepo } from "@/modules/clients/clients.repo.js";
import { ProposalController } from "./proposals.controller.js";
import { proposalRepo } from "./proposals.repo.js";
import { ProposalService } from "./proposals.service.js";
import { ClientOwnershipChecker } from "./proposals.util.js";

const clientOwnershipChecker = new ClientOwnershipChecker(clientRepo);

export const proposalService = new ProposalService(clientOwnershipChecker, proposalRepo);

export const proposalController = new ProposalController(proposalService);
