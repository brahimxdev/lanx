import { z } from "zod";
import { paginationSchema, createSortSchema } from "@/shared/pagination/index.js";
import { proposalStatusEnum, discountTypeEnum } from "@/db/schema/index.js";
import { PROPOSAL_SORT_FIELDS, SUPPORTED_CURRENCIES } from "./proposals.constants.js";

// Reusable sort schema
const proposalsSortSchema = createSortSchema(PROPOSAL_SORT_FIELDS);

const hasAtMostTwoDecimals = (input: number) =>
  Math.abs(input * 100 - Math.round(input * 100)) < 1e-6;

const TWO_DP = "must have at most 2 decimal places";

const MAX_VALUE = 10_000_000;

const MAX_AMOUNT = 1_000_000_000_000;

const lineItemInputSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  quantity: z.coerce.number().min(1).max(100_000).refine(hasAtMostTwoDecimals, TWO_DP),
  unitPrice: z.coerce.number().min(0).max(MAX_VALUE).refine(hasAtMostTwoDecimals, TWO_DP),
});

export const createProposalSchema = z
  .object({
    clientId: z.uuid("Invalid client ID"),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1),
    currencyCode: z.enum(SUPPORTED_CURRENCIES).default("USD"),
    discountType: z.enum(["fixed", "percentage"]).optional(),
    discountFixedValue: z.coerce.number().min(0).max(MAX_VALUE).optional(),
    discountPercentageValue: z.coerce
      .number()
      .min(0)
      .max(100)
      .refine(hasAtMostTwoDecimals, TWO_DP)
      .optional(),
    lineItems: z
      .array(lineItemInputSchema)
      .min(1, "At least one line item is required")
      .max(100, "At most 100 line items are allowed"),
  })
  .refine(
    (data) => {
      const hasFixedValue = data.discountFixedValue !== undefined;
      const hasPercentageValue = data.discountPercentageValue !== undefined;

      return (
        (data.discountType === "fixed" && hasFixedValue && !hasPercentageValue) ||
        (data.discountType === "percentage" && hasPercentageValue && !hasFixedValue) ||
        (data.discountType === undefined && !hasFixedValue && !hasPercentageValue)
      );
    },
    {
      path: ["discountType"],
      message: "discountType must match exactly one of discountFixedValue/discountPercentageValue",
    }
  );

export const listproposalsSchema = paginationSchema
  .extend({
    ...proposalsSortSchema.shape,

    // Filteration
    search: z
      .string()
      .min(1, "search query must be at least 1 characters")
      .max(100, "Search query must be less than 100 characters")
      .trim()
      .optional(),
    isIncludedArchived: z.enum(["true", "false"]).default("false"),
    status: z.preprocess(
      (value) => (value === undefined || Array.isArray(value) ? value : [value]),
      z
        .array(z.enum(proposalStatusEnum.enumValues))
        .min(1)
        .transform((statuses) => [...new Set(statuses)])
        .optional()
    ),

    currency: z.preprocess(
      (value) => (value === undefined || Array.isArray(value) ? value : [value]),
      z
        .array(z.enum(SUPPORTED_CURRENCIES))
        .min(1)
        .transform((currencies) => [...new Set(currencies)])
        .optional()
    ),
    expiresWithin: z
      .string()
      .regex(/^[1-9]\d{0,2}d$/, "Expected a duration like '7d'")
      .transform((s) => Number(s.slice(0, -1)))
      .pipe(z.number().max(365, "expiresWithin cannot exceed 365d"))
      .optional(),
    expiresFrom: z.iso
      .date()
      .transform((s) => new Date(s))
      .optional(),
    expiresTo: z.iso
      .date()
      .transform((s) => new Date(s))
      .optional(),

    discountType: z.preprocess(
      (value) => (value === undefined || Array.isArray(value) ? value : [value]),
      z
        .array(z.enum(discountTypeEnum.enumValues))
        .min(1)
        .transform((currencies) => [...new Set(currencies)])
        .optional()
    ),

    minAmount: z.coerce.number().min(0).max(MAX_AMOUNT).optional(),
    maxAmount: z.coerce.number().min(0).max(MAX_AMOUNT).optional(),
    totalAmount: z.coerce.number().min(0).max(MAX_AMOUNT).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.expiresWithin !== undefined && (data.expiresFrom || data.expiresTo)) {
      ctx.addIssue({
        code: "custom",
        path: ["expiresWithin"],
        message: "expiresWithin cannot be combined with expiresFrom/expiresTo",
      });
    }

    if (data.expiresFrom && data.expiresTo && data.expiresFrom > data.expiresTo) {
      ctx.addIssue({
        code: "custom",
        path: ["expresFrom"],
        message: "expiresFrom must not be after expiresTo",
      });
    }

    if (
      data.minAmount !== undefined &&
      data.maxAmount !== undefined &&
      data.minAmount > data.maxAmount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["minAmount"],
        message: "minAmount must not be greater than maxAmount",
      });
    }
  });

export const getProposalSchema = z.object({
  proposalId: z.uuid("Invalid proposal Id"),
});

export type ICreateProposal = z.infer<typeof createProposalSchema>;
export type IListProposals = z.infer<typeof listproposalsSchema>;
export type IGetProposal = z.infer<typeof getProposalSchema>;
