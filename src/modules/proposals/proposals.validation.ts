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

// ---------------------------------------------------------------------------
// Discount rule (shared by create and update)
// ---------------------------------------------------------------------------

type DiscountField = "discountFixedValue" | "discountPercentageValue";

interface DiscountInput {
  discountType?: "fixed" | "percentage" | null | undefined;
  discountFixedValue?: number | null | undefined;
  discountPercentageValue?: number | null | undefined;
}

// null and undefined both mean "no value". Spelled out because eqeqeq forbids `== null`.
// Deliberately not a falsy check: 0 is a real value (a 0 discount is allowed).
const isAbsent = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

export const checkDiscount = (
  d: DiscountInput,
  issue: (field: DiscountField, message: string) => void
): void => {
  const type = d.discountType;
  const fixed = d.discountFixedValue;
  const pct = d.discountPercentageValue;

  if (type === undefined) {
    // No type given: no value may be given either.
    if (!isAbsent(fixed)) issue("discountFixedValue", "requires discountType");
    if (!isAbsent(pct)) issue("discountPercentageValue", "requires discountType");
    return;
  }

  if (type === null) {
    // Explicit "no discount" (PATCH only): values must be absent or null.
    if (!isAbsent(fixed))
      issue("discountFixedValue", "must be null or omitted when discountType is null");
    if (!isAbsent(pct))
      issue("discountPercentageValue", "must be null or omitted when discountType is null");
    return;
  }

  if (type === "fixed") {
    if (isAbsent(fixed)) issue("discountFixedValue", "is required when discountType is 'fixed'");
    if (!isAbsent(pct))
      issue("discountPercentageValue", "must be null or omitted when discountType is 'fixed'");
    return;
  }

  // type === "percentage"
  if (isAbsent(pct))
    issue("discountPercentageValue", "is required when discountType is 'percentage'");
  if (!isAbsent(fixed))
    issue("discountFixedValue", "must be null or omitted when discountType is 'percentage'");
};

// Shared adapter, so the two schemas can't wire it differently.
const discountRefinement = (data: DiscountInput, ctx: z.core.$RefinementCtx) => {
  checkDiscount(data, (field, message) => {
    ctx.addIssue({ code: "custom", path: [field], message });
  });
};

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

// Strict numbers, not z.coerce: in a JSON body coerce turns "", null and false into 0,
// so `unitPrice: null` would silently become a free line item. The PATCH schema reuses
// these rules via `.shape`, so the same bug would have reached updates.
const lineItemInputSchema = z.object({
  description: z
    .string({ error: "must be a string" })
    .trim()
    .min(1, "must not be empty")
    .max(2000, "must be at most 2000 characters"),
  quantity: z
    .number({ error: "must be a number" })
    .min(1, "must be at least 1")
    .max(100_000, "must be at most 100000")
    .refine(hasAtMostTwoDecimals, TWO_DP),
  unitPrice: z
    .number({ error: "must be a number" })
    .min(0, "must be 0 or more")
    .max(MAX_VALUE, `must be at most ${String(MAX_VALUE)}`)
    .refine(hasAtMostTwoDecimals, TWO_DP),
});

export const createProposalSchema = z
  .object({
    clientId: z.uuid("Invalid client ID"),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1),
    currencyCode: z.enum(SUPPORTED_CURRENCIES).default("USD"),
    discountType: z.enum(["fixed", "percentage"]).optional(),
    discountFixedValue: z
      .number()
      .min(0)
      .max(MAX_VALUE)
      .refine(hasAtMostTwoDecimals, TWO_DP) // was missing: 10.999 used to pass
      .optional(),
    discountPercentageValue: z
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
  .superRefine(discountRefinement);

// ---------------------------------------------------------------------------
// List (query string, so z.coerce is correct here: every value arrives as a string)
// ---------------------------------------------------------------------------

export const listproposalsSchema = paginationSchema
  .extend({
    ...proposalsSortSchema.shape,

    // Filtration
    search: z
      .string()
      .trim() // before min, so "   " is rejected instead of passing min and becoming ""
      .min(1, "Search query must be at least 1 character")
      .max(100, "Search query must be less than 100 characters")
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
      .transform((s) => new Date(s)) // date-only ISO strings parse as UTC midnight
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
        .transform((types) => [...new Set(types)])
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
        path: ["expiresFrom"], // was "expresFrom": the error attached to a field that doesn't exist
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

const lineItemPatchSchema = z
  .strictObject({
    id: z.uuid("must be a valid id"),
    description: lineItemInputSchema.shape.description.optional(),
    quantity: lineItemInputSchema.shape.quantity.optional(),
    unitPrice: lineItemInputSchema.shape.unitPrice.optional(),
  })
  .refine(
    (item) =>
      item.description !== undefined || item.quantity !== undefined || item.unitPrice !== undefined,
    { message: "must include at least one of description, quantity, unitPrice" }
  );

export const updateProposalSchema = z
  .strictObject({
    title: z
      .string({ error: "must be a string" })
      .trim()
      .min(1, "must not be empty")
      .max(255, "must be at most 255 characters")
      .optional(),
    description: z
      .string({ error: "must be a string" })
      .trim()
      .min(1, "must not be empty")
      .optional(),
    discountType: z
      .enum(["fixed", "percentage"], { error: "must be 'fixed', 'percentage' or null" })
      .nullable()
      .optional(),
    discountFixedValue: z
      .number({ error: "must be a number" })
      .min(0, "must be 0 or more")
      .max(MAX_VALUE, `must be at most ${String(MAX_VALUE)}`)
      .refine(hasAtMostTwoDecimals, TWO_DP)
      .nullable()
      .optional(),
    discountPercentageValue: z
      .number({ error: "must be a number" })
      .min(0, "must be 0 or more")
      .max(100, "must be at most 100")
      .refine(hasAtMostTwoDecimals, TWO_DP)
      .nullable()
      .optional(),
    lineItems: z
      .array(lineItemPatchSchema, { error: "must be an array" })
      .min(1, "must contain at least one item")
      .max(100, "must contain at most 100 items")
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        "contains duplicate line item ids"
      )
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "at least one field must be provided",
  })
  .superRefine(discountRefinement);

export type ICreateProposal = z.infer<typeof createProposalSchema>;
export type IListProposals = z.infer<typeof listproposalsSchema>;
export type IGetProposal = z.infer<typeof getProposalSchema>;
export type IUpdateProposal = z.infer<typeof updateProposalSchema>;
