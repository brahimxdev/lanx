import type { Executor } from "@/db/executor.js";
import type {
  IProposalRepo,
  CreateProposalInput,
  CreateLineItemInput,
  ProposalWithLineItems,
  Proposal,
} from "./proposalRepo.interface.js";
import { db } from "@/db/client.js";
import { proposals, proposalLineItems } from "@/db/schema/index.js";
import { AppError } from "@/errors/index.js";
import type { IListProposals, ProposalSortField } from "./proposals.validation.js";
import { toOffset, type Paginated } from "@/shared/pagination/index.js";
import { asc, desc, eq, isNull, and, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

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

  // List proposals for a freelancer with pagination, sorting, and filteration
  async findManyByAuthUserId(
    queryParams: IListProposals,
    authUserId: string,
    executor: Executor = db
  ): Promise<Paginated<Proposal>> {
    const offset = toOffset(queryParams.page, queryParams.limit);

    const conditions = [eq(proposals.authUserId, authUserId)];

    if (queryParams.isIncludedArchived === "false") {
      conditions.push(isNull(proposals.archivedAt));
    }

    const PROPOSAL_SORT_COLUMNS = {
      createdAt: proposals.createdAt,
      totalAmount: proposals.totalAmount,
      viewedAt: proposals.viewedAt,
      acceptedAt: proposals.acceptedAt,
      declinedAt: proposals.declinedAt,
      updatedAt: proposals.updatedAt,
    } as const satisfies Record<ProposalSortField, AnyPgColumn>;

    const sortColumn = PROPOSAL_SORT_COLUMNS[queryParams.sortBy];
    const direction = queryParams.sortOrder === "asc" ? sql`asc` : sql`desc`;

    const orderBy = [
      sql`${sortColumn} ${direction} nulls last`,
      desc(proposals.createdAt),
      desc(proposals.id),
    ];

    const whereCondition = and(...conditions);

    const [data, countResult] = await Promise.all([
      executor
        .select()
        .from(proposals)
        .where(whereCondition)
        .orderBy(...orderBy)
        .limit(queryParams.limit)
        .offset(offset),
    ]);
  }
}

export const proposalRepo = new ProposalRepo();
