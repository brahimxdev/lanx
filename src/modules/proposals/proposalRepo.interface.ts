import type { Executor } from "@/db/executor.js";
import type {
  proposals,
  proposalLineItems,
  clients,
  authUsers,
  profiles,
} from "@/db/schema/index.js";
import type { IListProposals } from "./proposals.validation.js";
import type { Paginated } from "@/shared/pagination/index.js";
import type { IExpiryRange } from "./proposals.util.js";

export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;

export type LineItem = typeof proposalLineItems.$inferSelect;
export type NewLineItem = typeof proposalLineItems.$inferInsert;

type AuthUser = typeof authUsers.$inferSelect;
type Profile = typeof profiles.$inferSelect;
type Client = typeof clients.$inferSelect;

export type CreateProposalInput = Pick<
  NewProposal,
  | "clientId"
  | "title"
  | "description"
  | "currencyCode"
  | "discountType"
  | "discountFixedValue"
  | "discountPercentageValue"
> &
  Required<Pick<NewProposal, "subTotal" | "discountAmount" | "totalAmount">>;

export type CreateLineItemInput = Pick<NewLineItem, "description"> &
  Required<Pick<NewLineItem, "quantity" | "unitPrice" | "totalAmount">>;

export type ProposalWithLineItems = Proposal & { lineItems: LineItem[] };

export interface IListProposalsContext {
  now: Date;
  expiry?: IExpiryRange | undefined;
}

export type ProposalListItem = Pick<
  Proposal,
  | "id"
  | "title"
  | "status"
  | "totalAmount"
  | "currencyCode"
  | "expiresAt"
  | "viewedAt"
  | "acceptedAt"
  | "declinedAt"
  | "createdAt"
  | "updatedAt"
  | "archivedAt"
> & {
  client: Pick<Client, "id" | "firstName" | "lastName" | "companyName" | "email">;
};

export type ProposalGetItem = Pick<
  Proposal,
  | "id"
  | "title"
  | "description"
  | "status"
  | "currencyCode"
  | "expiresAt"
  | "subTotal"
  | "discountType"
  | "discountFixedValue"
  | "discountPercentageValue"
  | "discountAmount"
  | "totalAmount"
  | "sentAt"
  | "lastSentAt"
  | "viewedAt"
  | "changesRequestedAt"
  | "acceptedAt"
  | "declinedAt"
  | "createdAt"
  | "updatedAt"
  | "cancelledAt"
> & {
  proposalLineItems: Pick<
    LineItem,
    | "id"
    | "proposalId"
    | "description"
    | "quantity"
    | "unitPrice"
    | "totalAmount"
    | "createdAt"
    | "updatedAt"
  >[];
} & {
  freelancer: Pick<AuthUser, "email">;
} & {
  profile: Pick<Profile, "firstName" | "lastName" | "businessName" | "logoUrl">;
} & {
  client: Pick<Client, "firstName" | "lastName" | "email" | "companyName">;
};

export type UpdateProposalInput = Partial<
  Pick<
    NewProposal,
    | "title"
    | "description"
    | "currencyCode"
    | "discountType"
    | "discountFixedValue"
    | "discountPercentageValue"
    | "subTotal"
    | "discountAmount"
    | "totalAmount"
    | "status"
    | "viewedAt"
    | "updatedAt"
  >
>;

export type UpdateLineItemInput = Partial<
  Pick<NewLineItem, "description" | "quantity" | "unitPrice" | "totalAmount" | "updatedAt">
>;

// What the service needs from the locked row to decide and to recompute.
export type ProposalLockRow = Pick<
  Proposal,
  | "id"
  | "status"
  | "expiresAt"
  | "discountType"
  | "discountFixedValue"
  | "discountPercentageValue"
  | "updatedAt"
>;

export interface IProposalRepo {
  createProposalWithLineItems(
    proposalData: CreateProposalInput,
    lineItemsData: CreateLineItemInput[],
    authUserId: string,
    executor?: Executor
  ): Promise<ProposalWithLineItems>;

  findManyByAuthUserId(
    queryParams: IListProposals,
    authUserId: string,
    context: IListProposalsContext,
    executor?: Executor
  ): Promise<Paginated<ProposalListItem>>;

  findProposalById(
    proposalId: string,
    authUserId: string,
    executor?: Executor
  ): Promise<ProposalGetItem | undefined>;

  findByIdForUpdate(
    proposalId: string,
    authUserId: string,
    executor?: Executor
  ): Promise<ProposalLockRow | undefined>;

  findActiveLineItems(proposalId: string, executor?: Executor): Promise<LineItem[]>;

  updateLineItem(
    proposalId: string,
    lineItemId: string,
    data: UpdateLineItemInput,
    executor?: Executor
  ): Promise<LineItem[] | undefined>;

  updateProposalById(
    proposalId: string,
    authUserId: string,
    data: UpdateProposalInput,
    executor?: Executor
  ): Promise<Proposal | undefined>;

  archiveProposalById(
    proposalId: string,
    authUserId: string,
    executor?: Executor
  ): Promise<Proposal | undefined>;
}
