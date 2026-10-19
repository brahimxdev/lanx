import { z } from "zod";

const hasAtMostTwoDecimals = (input: number) =>
  Math.abs(input * 100 - Math.round(input * 100)) < 1e-6;

const TWO_DP = "must have at most 2 decimal places";

const MAX_VALUE = 10_000_000;

export const SUPPORTED_CURRENCIES = ["USD", "GBP", "EUR", "NGN", "CAD"] as const;

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

export type ICreateProposal = z.infer<typeof createProposalSchema>;
