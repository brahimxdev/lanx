import type { proposalStatusEnum } from "@/db/schema/index.js";

export type ProposalStatus = (typeof proposalStatusEnum.enumValues)[number];

// Statuses where the proposal is waiting on the client and a deadline can pass.
// draft is excluded (clock hasn't started); accepted/declined/cancelled are terminal.
export const EXPIRABLE_STATUSES = [
  "sent",
  "viewed",
  "changes_requested",
] as const satisfies readonly ProposalStatus[];
export type ExpirableStatus = (typeof EXPIRABLE_STATUSES)[number];

export const isExpirable = (status: ProposalStatus): status is ExpirableStatus =>
  (EXPIRABLE_STATUSES as readonly string[]).includes(status);

export const PROPOSAL_SORT_FIELDS = [
  "createdAt",
  "totalAmount",
  "viewedAt",
  "acceptedAt",
  "declinedAt",
  "updatedAt",
  "expiresAt",
] as const;
export const SUPPORTED_CURRENCIES = ["USD", "GBP", "EUR", "NGN", "CAD"] as const;

export type ProposalSortField = (typeof PROPOSAL_SORT_FIELDS)[number];
export type SupportedCurrencies = (typeof SUPPORTED_CURRENCIES)[number];
