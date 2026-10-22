import { AppError, ErrorCode } from "@/errors/index.js";
import {
  resolveExpiryDate,
  sanitizeProposal,
  type IClientOwnershipChecker,
} from "./proposals.util.js";
import type { ICreateProposal, IListProposals } from "./proposals.validation.js";
import {
  computeDiscountAmount,
  computeLineItemTotal,
  computeSubTotal,
  computeTotalAmount,
} from "./proposals.calculations.js";
import type { IProposalRepo } from "./proposalRepo.interface.js";

const MAX_AMOUNT = 9_999_999_999.99;

export class ProposalService {
  constructor(
    private readonly clientOwnershipChecker: IClientOwnershipChecker,
    private readonly proposalRepo: IProposalRepo
  ) {}

  // Create proposals for a client with line items
  async createProposal(input: ICreateProposal, authUserId: string) {
    // Check client ownership
    const clientRecord = await this.clientOwnershipChecker.clientExistForUser(
      input.clientId,
      authUserId
    );

    if (!clientRecord) {
      throw AppError.forbidden("Client not found", ErrorCode.FORBIDDEN);
    }

    // Compute line items
    const lineItems = input.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      totalAmount: computeLineItemTotal(li.quantity, li.unitPrice),
    }));

    const subTotal = computeSubTotal(lineItems);

    const discountAmount = computeDiscountAmount({
      subTotal: subTotal,
      discountType: input.discountType ?? null,
      discountFixedValue: input.discountFixedValue ?? null,
      discountPercentageValue: input.discountPercentageValue ?? null,
    });

    const totalAmount = computeTotalAmount(subTotal, discountAmount);

    // Business rules
    if (subTotal > MAX_AMOUNT) {
      throw AppError.badRequest("proposal total exceeds the maximum supported amount");
    }

    if (discountAmount !== null && discountAmount > subTotal) {
      throw AppError.badRequest("discount cannot exceed the proposal subtotal");
    }

    // One atomic write
    const proposal = await this.proposalRepo.createProposalWithLineItems(
      {
        clientId: input.clientId,
        title: input.title,
        description: input.description,
        currencyCode: input.currencyCode,
        discountType: input.discountType ?? null,
        discountFixedValue: input.discountFixedValue ?? null,
        discountPercentageValue: input.discountPercentageValue ?? null,
        subTotal,
        discountAmount,
        totalAmount,
      },
      lineItems,
      authUserId
    );

    const newProposal = sanitizeProposal(proposal);
    return { newProposal };
  }

  // List proposals
  async listProposals(queryParams: IListProposals, authUserId: string) {
    const now = new Date();
    const expiry = resolveExpiryDate(queryParams, now);

    const { data, meta } = await this.proposalRepo.findManyByAuthUserId(queryParams, authUserId, {
      now,
      expiry,
    });

    return { data, meta };
  }
}
