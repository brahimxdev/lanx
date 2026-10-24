import type { Executor } from "@/db/executor.js";
import type {
  IProposalRepo,
  CreateProposalInput,
  CreateLineItemInput,
  ProposalWithLineItems,
  IListProposalsContext,
  ProposalListItem,
  ProposalGetItem,
} from "./proposalRepo.interface.js";
import { db } from "@/db/client.js";
import { proposals, proposalLineItems, clients, authUsers, profiles } from "@/db/schema/index.js";
import { AppError } from "@/errors/index.js";
import type { IListProposals } from "./proposals.validation.js";
import { paginate, toOffset, type Paginated } from "@/shared/pagination/index.js";
import {
  ilike,
  lte,
  desc,
  eq,
  isNull,
  and,
  sql,
  inArray,
  type SQL,
  lt,
  or,
  gte,
  asc,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  EXPIRABLE_STATUSES,
  isExpirable,
  type ProposalStatus,
  type ProposalSortField,
} from "./proposals.constants.js";

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
    { now, expiry }: IListProposalsContext,
    executor: Executor = db
  ): Promise<Paginated<ProposalListItem>> {
    const offset = toOffset(queryParams.page, queryParams.limit);

    // Status condition

    const PROPOSAL_SORT_COLUMNS = {
      createdAt: proposals.createdAt,
      totalAmount: proposals.totalAmount,
      viewedAt: proposals.viewedAt,
      acceptedAt: proposals.acceptedAt,
      declinedAt: proposals.declinedAt,
      updatedAt: proposals.updatedAt,
      expiresAt: proposals.expiresAt,
    } as const satisfies Record<ProposalSortField, AnyPgColumn>;

    const sortColumn = PROPOSAL_SORT_COLUMNS[queryParams.sortBy];
    const direction = queryParams.sortOrder === "asc" ? sql`asc` : sql`desc`;

    const orderBy = [
      sql`${sortColumn} ${direction} nulls last`,
      desc(proposals.createdAt),
      desc(proposals.id),
    ];

    const buildStatusCondition = (statuses: ProposalStatus[], now: Date): SQL | undefined => {
      const parts: (SQL | undefined)[] = [];

      if (statuses.includes("expired")) {
        parts.push(
          eq(proposals.status, "expired"),
          and(inArray(proposals.status, [...EXPIRABLE_STATUSES]), lt(proposals.expiresAt, now))
        );
      }

      const rest = statuses.filter((status) => status !== "expired");
      const expirable = rest.filter(isExpirable);
      const stable = rest.filter((status) => !isExpirable(status));

      if (stable.length) {
        parts.push(inArray(proposals.status, stable));
      }

      if (expirable.length) {
        parts.push(
          and(
            inArray(proposals.status, expirable),
            or(isNull(proposals.expiresAt), gte(proposals.expiresAt, now))
          )
        );
      }

      return or(...parts);
    };

    const conditions: (SQL | undefined)[] = [eq(proposals.authUserId, authUserId)];

    // Push conditions if provided
    if (queryParams.isIncludedArchived === "false") {
      conditions.push(isNull(proposals.archivedAt));
    }

    if (queryParams.status?.length) {
      conditions.push(buildStatusCondition(queryParams.status, now));
    }

    if (queryParams.currency?.length) {
      conditions.push(inArray(proposals.currencyCode, queryParams.currency));
    }

    if (expiry) {
      if (expiry.from) conditions.push(gte(proposals.expiresAt, expiry.from));
      if (expiry.to) conditions.push(lt(proposals.expiresAt, expiry.to));
      if (expiry.pendingOnly) conditions.push(inArray(proposals.status, [...EXPIRABLE_STATUSES]));
    }

    if (queryParams.discountType?.length) {
      conditions.push(inArray(proposals.discountType, queryParams.discountType));
    }

    if (queryParams.minAmount) {
      conditions.push(gte(proposals.totalAmount, queryParams.minAmount));
    }
    if (queryParams.maxAmount) {
      conditions.push(lte(proposals.totalAmount, queryParams.maxAmount));
    }

    if (queryParams.totalAmount) {
      conditions.push(eq(proposals.totalAmount, queryParams.totalAmount));
    }

    const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

    if (queryParams.search) {
      const pattern = `%${escapeLike(queryParams.search)}%`;

      const searchCondition = or(
        ilike(proposals.title, pattern),
        ilike(proposals.description, pattern),
        ilike(clients.firstName, pattern),
        ilike(clients.lastName, pattern),
        ilike(clients.email, pattern),
        ilike(clients.companyName, pattern)
      );

      if (searchCondition) conditions.push(searchCondition);
    }

    const whereCondition = and(...conditions);

    // Query the databse
    const [data, countResult] = await Promise.all([
      executor
        .select({
          // Proposal
          id: proposals.id,
          title: proposals.title,
          status: proposals.status,
          totalAmount: proposals.totalAmount,
          currencyCode: proposals.currencyCode,
          expiresAt: proposals.expiresAt,
          viewedAt: proposals.viewedAt,
          acceptedAt: proposals.acceptedAt,
          declinedAt: proposals.declinedAt,
          createdAt: proposals.createdAt,
          updatedAt: proposals.updatedAt,
          archivedAt: proposals.archivedAt,

          // Client
          client: {
            id: clients.id,
            firstName: clients.firstName,
            lastName: clients.lastName,
            companyName: clients.companyName,
            email: clients.email,
          },
        })
        .from(proposals)
        .innerJoin(
          clients,
          and(eq(proposals.clientId, clients.id), eq(clients.authUserId, authUserId))
        )
        .where(whereCondition)
        .orderBy(...orderBy)
        .limit(queryParams.limit)
        .offset(offset),

      executor
        .select({ count: sql<number>`count(*)::int` })
        .from(proposals)
        .innerJoin(
          clients,
          and(eq(proposals.clientId, clients.id), eq(clients.authUserId, authUserId))
        )
        .where(whereCondition),
    ]);

    const total = countResult[0]?.count ?? 0;

    return paginate(data, queryParams.page, queryParams.limit, total);
  }

  // Get a proposal by id for a freelancer, including the proposalLineItems, authUsers(email), profiles, clients table
  async findProposalById(
    proposalId: string,
    authUserId: string,
    executor: Executor = db
  ): Promise<ProposalGetItem | undefined> {
    const [proposalRecord] = await executor
      .select({
        id: proposals.id,
        title: proposals.title,
        description: proposals.description,
        status: proposals.status,
        currencyCode: proposals.currencyCode,
        expiresAt: proposals.expiresAt,
        subTotal: proposals.subTotal,
        discountType: proposals.discountType,
        discountFixedValue: proposals.discountFixedValue,
        discountPercentageValue: proposals.discountPercentageValue,
        discountAmount: proposals.discountAmount,
        totalAmount: proposals.totalAmount,
        sentAt: proposals.sentAt,
        lastSentAt: proposals.lastSentAt,
        viewedAt: proposals.viewedAt,
        changesRequestedAt: proposals.changesRequestedAt,
        acceptedAt: proposals.acceptedAt,
        declinedAt: proposals.declinedAt,
        createdAt: proposals.createdAt,
        updatedAt: proposals.updatedAt,
        cancelledAt: proposals.cancelledAt,

        freelancer: { email: authUsers.email },
        profile: {
          firstName: profiles.firstName,
          lastName: profiles.lastName,
          businessName: profiles.businessName,
          logoUrl: profiles.logoUrl,
        },
        client: {
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
          companyName: clients.companyName,
        },
      })
      .from(proposals)
      .innerJoin(authUsers, eq(authUsers.id, proposals.authUserId))
      .innerJoin(profiles, eq(profiles.authUserId, proposals.authUserId))
      .innerJoin(
        clients,
        and(eq(clients.id, proposals.clientId), eq(clients.authUserId, authUserId))
      )
      .where(
        and(
          eq(proposals.id, proposalId),
          eq(proposals.authUserId, authUserId),
          isNull(proposals.archivedAt)
        )
      )
      .limit(1);

    // Not found, not yours, or archived: callers can't tell which, and shouldn't.
    if (!proposalRecord) return undefined;

    const lineItems = await executor
      .select({
        id: proposalLineItems.id,
        proposalId: proposalLineItems.proposalId,
        description: proposalLineItems.description,
        quantity: proposalLineItems.quantity,
        unitPrice: proposalLineItems.unitPrice,
        totalAmount: proposalLineItems.totalAmount,
        createdAt: proposalLineItems.createdAt,
        updatedAt: proposalLineItems.updatedAt,
      })
      .from(proposalLineItems)
      .where(
        and(
          eq(proposalLineItems.proposalId, proposalRecord.id),
          isNull(proposalLineItems.archivedAt)
        )
      )
      .orderBy(asc(proposalLineItems.createdAt), asc(proposalLineItems.id));

    return { ...proposalRecord, proposalLineItems: lineItems };
  }
}
export const proposalRepo = new ProposalRepo();
