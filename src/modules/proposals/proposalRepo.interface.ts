import type { Executor } from "@/db/executor.js";
import type { proposals, proposalLineItems } from "@/db/schema/index.js";

export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;

export type LineItem = typeof proposalLineItems.$inferSelect;
export type NewLineItem = typeof proposalLineItems.$inferInsert;

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

export interface IProposalRepo {
  createProposalWithLineItems(
    proposalData: CreateProposalInput,
    lineItemsData: CreateLineItemInput[],
    authUserId: string,
    executor?: Executor
  ): Promise<ProposalWithLineItems>;
}
