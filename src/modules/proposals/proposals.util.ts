import type { IClientRepo } from "@/modules/clients/clientsRepo.Interface.js";
import type { ProposalWithLineItems } from "./proposalRepo.interface.js";

export interface IClientOwnershipChecker {
  clientExistForUser(clientId: string, authUserId: string): Promise<boolean>;
}

export class ClientOwnershipChecker implements IClientOwnershipChecker {
  constructor(private readonly clientRepo: Pick<IClientRepo, "findById">) {}

  async clientExistForUser(clientId: string, authUserId: string): Promise<boolean> {
    const clientRecord = await this.clientRepo.findById(clientId, authUserId);

    return clientRecord !== null;
  }
}

export const sanitizeProposal = (proposal: ProposalWithLineItems) => {
  return {
    id: proposal.id,
    authUserId: proposal.authUserId,
    clientId: proposal.clientId,
    status: proposal.status,
    currencyCode: proposal.currencyCode,
    expiresAt: proposal.expiresAt,
    subTotal: proposal.subTotal,
    discountType: proposal.discountType,
    discountFixedValue: proposal.discountFixedValue,
    discountPercentageValue: proposal.discountPercentageValue,
    discountAmount: proposal.discountAmount,
    totalAmount: proposal.totalAmount,
    sentAt: proposal.sentAt,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
    lineItems: proposal.lineItems.map((li) => ({
      id: li.id,
      proposalId: li.proposalId,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      totalAmount: li.totalAmount,
    })),
  };
};
