export const computeLineItemTotal = (quantity: number, unitPrice: number): number => {
  const lineItemTotal = Math.round(quantity * unitPrice * 100) / 100;

  return lineItemTotal;
};

export const computeSubTotal = (lineItems: { totalAmount: number }[]): number => {
  const subTotal = Math.round(lineItems.reduce((sum, li) => sum + li.totalAmount, 0) * 100) / 100;

  return subTotal;
};

export interface IDiscount {
  discountType: "fixed" | "percentage" | null;
  discountFixedValue: number | null;
  discountPercentageValue: number | null;
}

interface IComputeDiscountAmount extends IDiscount {
  subTotal: number;
}

export const computeDiscountAmount = ({
  subTotal,
  discountType,
  discountFixedValue,
  discountPercentageValue,
}: IComputeDiscountAmount): number | null => {
  if (discountType === "fixed") return discountFixedValue;
  if (discountType === "percentage") {
    return Math.round(((subTotal * (discountPercentageValue ?? 0)) / 100) * 100) / 100;
  }

  return null;
};

export const computeTotalAmount = (subTotal: number, discountAmount: number | null): number => {
  const totalAmount = Math.round((subTotal - (discountAmount ?? 0)) * 100) / 100;
  return totalAmount;
};

interface IDiscountInput {
  discountType?: "fixed" | "percentage" | null | undefined;
  discountFixedValue?: number | null | undefined;
  discountPercentageValue?: number | null | undefined;
}

export function mergeDiscount(current: IDiscount, input: IDiscountInput): IDiscount {
  switch (input.discountType) {
    case undefined:
      // Copy only the discount fields. Returning `current` itself would also carry any
      // extra properties of the object the caller passed in (id, status, ...).
      return {
        discountType: current.discountType,
        discountFixedValue: current.discountFixedValue,
        discountPercentageValue: current.discountPercentageValue,
      };
    case null:
      return { discountType: null, discountFixedValue: null, discountPercentageValue: null };
    case "fixed":
      return {
        discountType: "fixed",
        discountFixedValue: input.discountFixedValue ?? null,
        discountPercentageValue: null, // the value that doesn't apply is always cleared
      };
    case "percentage":
      return {
        discountType: "percentage",
        discountFixedValue: null,
        discountPercentageValue: input.discountPercentageValue ?? null,
      };
  }
}

// Reusable by create as well: a fixed discount larger than the subtotal gives a negative total.
export const isDiscountOverSubTotal = (subTotal: number, discount: IDiscount): boolean =>
  discount.discountType === "fixed" && (discount.discountFixedValue ?? 0) > subTotal;
