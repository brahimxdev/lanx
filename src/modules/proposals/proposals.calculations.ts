export const computeLineItemTotal = (quantity: number, unitPrice: number): number => {
  const lineItemTotal = Math.round(quantity * unitPrice * 100) / 100;

  return lineItemTotal;
};

export const computeSubTotal = (lineItems: { totalAmount: number }[]): number => {
  const subTotal = Math.round(lineItems.reduce((sum, li) => sum + li.totalAmount, 0) * 100) / 100;

  return subTotal;
};

interface IComputeDiscountAmount {
  subTotal: number;
  discountType: "fixed" | "percentage" | null;
  discountFixedValue: number | null;
  discountPercentageValue: number | null;
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
