import type { Executor } from "@/db/executor.js";
import type {
  IProposalRepo,
  CreateProposalInput,
  CreateLineItemInput,
  ProposalWithLineItems,
} from "./proposalRepo.interface.js";
import { db } from "@/db/client.js";
import { proposals, proposalLineItems } from "@/db/schema/index.js";
import { AppError } from "@/errors/index.js";

export class ProposalRepo implements IProposalRepo {
  async createProposalWithLineItems(
    proposalData: CreateProposalInput,
    lineItemData: CreateLineItemInput[],
    authUserId: string,
    executor: Executor = db
  ): Promise<ProposalWithLineItems> {
    const { proposalRecord, lineItemRecords } = await executor.transaction(async (tx) => {
      // tx 1 - create proposal record
      const [proposalRecord] = await tx
        .insert(proposals)
        .values({
          authUserId,
          clientId: proposalData.clientId,
          title: proposalData.title,
          description: proposalData.description,
          currencyCode: proposalData.currencyCode,
          discountType: proposalData.discountType ?? null,
          discountFixedValue: proposalData.discountFixedValue ?? null,
          discountPercentageValue: proposalData.discountPercentageValue ?? null,
          subTotal: proposalData.subTotal,
          discountAmount: proposalData.discountAmount,
          totalAmount: proposalData.totalAmount,
          status: "draft",
          expiresAt: null,
          sentAt: null,
          publicTokenHash: null,
        })
        .returning();

      if (!proposalRecord) {
        throw AppError.internalServerError("Failed to insert proposal"); // rolls back the transaction
      }

      // tx 2 - create line items record tied to the created proposal
      const lineItemRecords = await tx
        .insert(proposalLineItems)
        .values(
          lineItemData.map((li) => ({
            proposalId: proposalRecord.id,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            totalAmount: li.totalAmount,
          }))
        )
        .returning();

      // 3. Whatever the callback returns becomes the transaction's result.
      return { proposalRecord, lineItemRecords };
    });

    return { ...proposalRecord, lineItems: lineItemRecords };
  }
}

export const proposalRepo = new ProposalRepo();
