export const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Waiting for payment",
  funded: "Money held",
  released: "Paid out",
  refunded: "Refunded",
  partial: "Partly paid",
  needs_review: "Needs a decision",
  pending: "Not started",
};

export const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
