import type { Executor } from "@/db/executor.js";
import {
  type proposals,
  type proposalLineItems,
  type clients,
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
}
