import { AppError, ErrorCode } from "@/errors/index.js";
import {
  resolveExpiryDate,
  sanitizeProposal,
  type IClientOwnershipChecker,
} from "./proposals.util.js";
import type { ICreateProposal, IListProposals, IUpdateProposal } from "./proposals.validation.js";
import {
  computeDiscountAmount,
  computeLineItemTotal,
  computeSubTotal,
  computeTotalAmount,
  isDiscountOverSubTotal,
  mergeDiscount,
} from "./proposals.calculations.js";
import type {
  IProposalRepo,
  ProposalWithLineItems,
  UpdateLineItemInput,
  UpdateProposalInput,
} from "./proposalRepo.interface.js";
import { db } from "@/db/client.js";
import { isEditable } from "./proposals.constants.js";

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
    const newProposal = await this.proposalRepo.createProposalWithLineItems(
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

  // Get proposal by ID
  async getProposalById(proposalId: string, authUserId: string) {
    const proposal = await this.proposalRepo.findProposalById(proposalId, authUserId);

    if (!proposal) {
      throw AppError.notFound("Proposal not found", ErrorCode.NOT_FOUND);
    }

    return { proposal };
  }

  // Update proposal by Id
  async updateProposal(
    input: IUpdateProposal,
    proposalId: string,
    authUserId: string
  ): Promise<ProposalWithLineItems> {
    const now = new Date();

    return db.transaction(async (tx) => {
      // 1. Lock the row. Concurrent edits, accept, and the expiry sweep now queue behind
      //    this transaction, so everything we read below stays true until we commit.

      const proposalRecordToLock = await this.proposalRepo.findByIdForUpdate(
        proposalId,
        authUserId,
        tx
      );

      if (!proposalRecordToLock) {
        throw AppError.notFound("proposal not found", ErrorCode.NOT_FOUND);
      }

      // Check if proposal is in the expirable states
      if (!isEditable(proposalRecordToLock.status)) {
        throw AppError.conflict(
          `Proposal cannot be updated when it's status is ${proposalRecordToLock.status} `,
          ErrorCode.CONFLICT
        );
      }

      // Find active line items and verify id supplied belongs to the proposal

      const activeItems = await this.proposalRepo.findActiveLineItems(proposalId, tx);
      const itemById = new Map(activeItems.map((item) => [item.id, item]));
      const lineTotals = new Map(activeItems.map((item) => [item.id, item.totalAmount]));

      const itemWrites: { id: string; data: UpdateLineItemInput }[] = [];
      const fields: Record<string, string> = {};
      const seenIds = new Set<string>();

      for (const [index, entry] of (input.lineItems ?? []).entries()) {
        const existing = itemById.get(entry.id);

        if (!existing) {
          fields[`lineItems.${String(index)}.id`] = "does not exist on this proposal";
          continue;
        }

        // The schema already rejects duplicates; this keeps the service safe on its own.
        if (seenIds.has(entry.id)) {
          fields[`lineItems.${String(index)}.id`] = "duplicate line item ID";
          continue;
        }
        seenIds.add(entry.id);

        const data: UpdateLineItemInput = { updatedAt: now };
        if (entry.description !== undefined) data.description = entry.description;

        if (entry.quantity !== undefined || entry.unitPrice !== undefined) {
          const quantity = entry.quantity ?? existing.quantity;
          const unitPrice = entry.unitPrice ?? existing.unitPrice;
          const total = computeLineItemTotal(quantity, unitPrice);

          data.quantity = quantity;
          data.unitPrice = unitPrice;
          data.totalAmount = total;
          lineTotals.set(existing.id, total);
        }

        itemWrites.push({ id: existing.id, data });
      }

      const discount = mergeDiscount(proposalRecordToLock, input);

      let totals:
        | { subTotal: number; discountAmount: number | null; totalAmount: number }
        | undefined;

      if (input.lineItems !== undefined || input.discountType !== undefined) {
        const subTotal = computeSubTotal(
          [...lineTotals.values()].map((totalAmount) => ({ totalAmount }))
        );

        if (isDiscountOverSubTotal(subTotal, discount)) {
          fields.discountFixedValue = `cannot exceed the subtotal (${subTotal.toFixed(2)})`;
        } else {
          const discountAmount = computeDiscountAmount({ subTotal, ...discount });
          totals = {
            subTotal,
            discountAmount,
            totalAmount: computeTotalAmount(subTotal, discountAmount),
          };
        }
      }

      if (Object.keys(fields).length > 0) {
        throw AppError.badRequest("Validation failed", ErrorCode.VALIDATION_ERROR, { fields });
      }

      for (const { id, data } of itemWrites) {
        const updated = await this.proposalRepo.updateLineItem(proposalId, id, data, tx);

        // Can't happen while the proposal row is locked; throwing rolls everything back.
        if (!updated) {
          throw AppError.forbidden(`Line item ${id} vanished while its proposal was locked`);
        }
      }

      // Edited after the client may have seen it: back to `sent`, and "viewed" is cleared.
      const demote =
        proposalRecordToLock.status === "sent" || proposalRecordToLock.status === "viewed";

      const proposalPatch: UpdateProposalInput = {
        updatedAt: now,
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.discountType !== undefined && {
          discountType: discount.discountType,
          discountFixedValue: discount.discountFixedValue,
          discountPercentageValue: discount.discountPercentageValue,
        }),
        ...totals, // subTotal, discountAmount, totalAmount: spreading undefined adds nothing
        ...(demote && { status: "sent" as const, viewedAt: null }),
      };

      const updatedProposal = await this.proposalRepo.updateProposalById(
        proposalId,
        authUserId,
        proposalPatch,
        tx
      );

      if (!updatedProposal) {
        throw AppError.forbidden("Proposal vanished while locked");
      }

      const lineItems = await this.proposalRepo.findActiveLineItems(proposalId, tx);

      return { ...updatedProposal, lineItems };
    });
  }

  // Archive proposal by Id
  async archiveProposal(proposalId: string, authUserId: string) {
    const result = await this.proposalRepo.archiveProposalById(proposalId, authUserId);

    if (!result) {
      throw AppError.notFound("Proposal not found", ErrorCode.NOT_FOUND);
    }

    return { result };
  }
}
