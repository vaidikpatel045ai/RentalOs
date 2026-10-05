import type { PaymentStatus, PaymentType } from "@prisma/client";

/**
 * The security deposit is held separately and refunded after return, so a
 * DEPOSIT payment never counts toward what the customer has paid on the
 * booking itself. Everything else they hand over (rental fee, advance,
 * balance, fees, charges) does.
 */
export function countsTowardBalance(type: PaymentType): boolean {
  return type !== "DEPOSIT";
}

/** Paid / balance / status for a booking total and what's been paid toward it.
 * "Paid" only once the whole booking total is covered. */
export function bookingPaymentState(totalAmount: number, paidTowardBooking: number): {
  paidAmount: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
} {
  const paidAmount = Math.round(paidTowardBooking * 100) / 100;
  const balanceDue = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
  const paymentStatus: PaymentStatus = balanceDue <= 0 ? "PAID" : paidAmount > 0 ? "PARTIALLY_PAID" : "UNPAID";
  return { paidAmount, balanceDue, paymentStatus };
}
