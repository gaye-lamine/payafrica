import { PaymentError } from "./types.js";

export function validateRefundAmount<ProviderError extends Error>(
  amount: number,
  createError: (code: PaymentError, message: string) => ProviderError
): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw createError(
      PaymentError.InvalidRefundAmount,
      "Refund amount must be a positive safe integer in minor currency units"
    );
  }
}
