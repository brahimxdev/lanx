import type { IClientRepo } from "@/modules/clients/clientsRepo.Interface.js";
import type { ProposalWithLineItems } from "./proposalRepo.interface.js";
import type { IListProposals } from "./proposals.validation.js";

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
    title: proposal.title,
    description: proposal.description,
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
    lastSentAt: proposal.lastSentAt,
    viewedAt: proposal.viewedAt,
    changesRequestedAt: proposal.changesRequestedAt,
    acceptedAt: proposal.acceptedAt,
    declinedAt: proposal.declinedAt,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
    cancelledAt: proposal.cancelledAt,
    archivedAt: proposal.archivedAt,
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

// Expiry date resolver
export interface IExpiryRange {
  from?: Date | undefined;
  to?: Date | undefined;
  pendingOnly: boolean;
}
const DAY_MS = 86_400_00;

export const resolveExpiryDate = (
  query: Pick<IListProposals, "expiresWithin" | "expiresFrom" | "expiresTo">,
  now: Date
): IExpiryRange | undefined => {
  if (query.expiresWithin !== undefined) {
    return {
      from: now,
      to: new Date(now.getTime() + query.expiresWithin * DAY_MS),
      pendingOnly: true,
    };
  }

  if (query.expiresFrom || query.expiresTo) {
    return {
      from: query.expiresFrom,
      to: query.expiresTo && new Date(query.expiresTo.getTime() + DAY_MS),
      pendingOnly: false,
    };
  }

  return undefined;
};
