"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCan, permissionError } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/customer-actions";
import { bookingPaymentState, countsTowardBalance } from "@/lib/payments";
import { findAccessibleBooking } from "@/lib/invoices/invoices";
import type { PaymentType, TransactionMethod } from "@prisma/client";

/**
 * Recording a payment must affect the booking's paymentStatus/balanceDue —
 * spec section 38 ("A payment must affect booking status"). This is the
 * single place that mutation happens so the two can never drift apart.
 */
export async function recordPayment(
  bookingId: string,
  input: { type: PaymentType; amount: number; method: TransactionMethod; reference?: string }
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "payments", "create");
  if (permissionMsg) return { error: permissionMsg };

  if (input.amount <= 0) return { error: "Amount must be greater than zero." };
  if (!(await findAccessibleBooking(session.user, bookingId))) return { error: "Booking not found." };

  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  const isDeposit = !countsTowardBalance(input.type);

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        bookingId,
        type: input.type,
        amount: input.amount,
        method: input.method,
        reference: input.reference || null,
        receivedByUserId: session.user.id,
      },
    });

    // A security deposit is held separately: it doesn't reduce the balance or
    // make the booking "Paid". The booking is still touched so its invoice
    // (which shows whether the deposit was received) regenerates.
    const state = isDeposit
      ? null
      : bookingPaymentState(Number(booking.totalAmount), Number(booking.paidAmount) + input.amount);

    await tx.booking.update({
      where: { id: bookingId },
      data: state ?? { updatedAt: new Date() },
    });

    await tx.bookingEvent.create({
      data: {
        bookingId,
        eventType: isDeposit ? "DEPOSIT_RECEIVED" : "PAYMENT_RECEIVED",
        description: isDeposit
          ? `Security deposit of ${input.amount} received via ${input.method.replaceAll("_", " ")} (held, refundable)`
          : `${input.type.replaceAll("_", " ")} payment of ${input.amount} received via ${input.method.replaceAll("_", " ")}`,
        actorUserId: session.user.id,
        actorRole: session.user.role,
      },
    });
  });

  updateTag("dashboard");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return {};
}

export async function updateBookingStatus(bookingId: string, status: "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "bookings", "update");
  if (!(await findAccessibleBooking(session.user, bookingId))) throw new Error("Booking not found.");

  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });

  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status } });
    await tx.bookingEvent.create({
      data: {
        bookingId,
        eventType: "STATUS_CHANGE",
        description: `Status changed from ${booking.status} to ${status}`,
        actorUserId: session.user.id,
        actorRole: session.user.role,
        oldValue: booking.status,
        newValue: status,
      },
    });
  });

  updateTag("dashboard");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
}

/**
 * Refunding a deposit creates a Refund record and updates the Deposit's
 * status/refundedAmount — the two must always move together, so this is
 * the only place either changes (spec section 17: "After return: Refund").
 */
export async function refundDeposit(depositId: string, amount: number, reason?: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "payments", "approve");
  if (permissionMsg) return { error: permissionMsg };

  const deposit = await db.deposit.findUnique({ where: { id: depositId } });
  if (!deposit || !(await findAccessibleBooking(session.user, deposit.bookingId))) return { error: "Deposit not found." };
  if (amount <= 0 || amount > Number(deposit.amount) - Number(deposit.refundedAmount)) {
    return { error: "Refund amount must be between 0 and the remaining deposit balance." };
  }

  const newRefunded = Number(deposit.refundedAmount) + amount;
  const isFull = newRefunded >= Number(deposit.amount);

  await db.$transaction(async (tx) => {
    await tx.refund.create({
      data: {
        bookingId: deposit.bookingId,
        amount,
        reason: reason || "Deposit refund",
        processedByUserId: session.user.id,
      },
    });
    await tx.deposit.update({
      where: { id: depositId },
      data: {
        refundedAmount: newRefunded,
        status: isFull ? "REFUNDED" : "PARTIALLY_REFUNDED",
        refundedAt: new Date(),
      },
    });
    await tx.bookingEvent.create({
      data: {
        bookingId: deposit.bookingId,
        eventType: "DEPOSIT_REFUNDED",
        description: `Refunded ${amount} of the security deposit${reason ? ` — ${reason}` : ""}`,
        actorUserId: session.user.id,
        actorRole: session.user.role,
      },
    });
  });

  updateTag("dashboard");
  revalidatePath("/dashboard/payments");
  revalidatePath(`/dashboard/bookings/${deposit.bookingId}`);
  return {};
}
