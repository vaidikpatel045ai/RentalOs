"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { permissionError } from "@/lib/permissions";
import { bookingSchema, type BookingInput } from "@/lib/validations/booking";
import { checkAvailability, findOverlappingBooking } from "@/lib/availability-engine";
import type { ActionState } from "@/lib/actions/customer-actions";

export interface BookingActionState extends ActionState {
  requiresConfirmation?: boolean;
  riskReasons?: string[];
}

/**
 * Numeric-max-based (not count-based) so the sequence can never collide
 * after a cancellation/deletion or any non-sequential seeding — see the
 * equivalent fix on delivery job numbers for the bug this avoids.
 */
async function generateBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BK-${year}-`;
  const existing = await db.booking.findMany({
    where: { bookingNumber: { startsWith: prefix } },
    select: { bookingNumber: true },
  });
  const maxNum = existing.reduce((max, { bookingNumber }) => {
    const n = parseInt(bookingNumber.slice(prefix.length), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

export async function createBooking(input: BookingInput): Promise<BookingActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "bookings", "create");
  if (permissionMsg) return { error: permissionMsg };

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  // 1. Advisory risk check per garment (UI already showed this; re-verify).
  const riskReasons: string[] = [];
  let worstRisk: "SAFE" | "TIGHT" | "UNSAFE" = "SAFE";
  for (const item of data.items) {
    const result = await checkAvailability({
      garmentId: item.garmentId,
      proposedStart: data.rentalStart,
      proposedEnd: data.rentalEnd,
    });
    if (result.risk === "UNSAFE") {
      return { error: `Cannot book safely: ${result.reasons.join(" ")}` };
    }
    if (result.risk === "TIGHT") {
      worstRisk = "TIGHT";
      riskReasons.push(...result.reasons);
    }
  }
  if (worstRisk === "TIGHT" && !data.acknowledgeRisk) {
    return { requiresConfirmation: true, riskReasons };
  }

  const rentalFee = data.items.reduce((sum, i) => sum + i.priceAtBooking, 0);
  const depositAmount = data.items.reduce((sum, i) => sum + i.depositAtBooking, 0);

  const branch = await db.branch.findUniqueOrThrow({ where: { id: data.branchId } });
  const taxable = Math.max(0, rentalFee - data.discount);
  const taxAmount = (taxable * Number(branch.taxRate)) / 100;
  const totalAmount = taxable + taxAmount + data.deliveryFee;

  try {
    const booking = await db.$transaction(
      async (tx) => {
        // 2. Hard conflict re-check inside the transaction — the authoritative
        // guard against a race between the advisory check above and this insert.
        for (const item of data.items) {
          const conflict = await findOverlappingBooking({
            garmentId: item.garmentId,
            proposedStart: data.rentalStart,
            proposedEnd: data.rentalEnd,
          });
          if (conflict) {
            throw new Error(`Garment is no longer available — just booked on ${conflict.bookingNumber}.`);
          }
        }

        const bookingNumber = await generateBookingNumber();

        const created = await tx.booking.create({
          data: {
            bookingNumber,
            branchId: data.branchId,
            customerId: data.customerId,
            status: "CONFIRMED",
            paymentStatus: "UNPAID",
            rentalStart: data.rentalStart,
            rentalEnd: data.rentalEnd,
            weddingDate: data.weddingDate,
            pickupDate: data.pickupDate,
            returnDate: data.returnDate,
            trialDate: data.trialDate,
            fittingDate: data.fittingDate,
            deliveryMethod: data.deliveryMethod,
            returnMethod: data.returnMethod,
            pickupLocation: data.pickupLocation || null,
            rentalFee,
            discount: data.discount,
            taxAmount,
            depositAmount,
            deliveryFee: data.deliveryFee,
            totalAmount,
            balanceDue: totalAmount,
            assignedStaffId: data.assignedStaffId || session.user.id,
            notes: data.notes || null,
            items: {
              create: data.items.map((i) => ({
                garmentId: i.garmentId,
                priceAtBooking: i.priceAtBooking,
                depositAtBooking: i.depositAtBooking,
                notes: i.notes || null,
              })),
            },
            events: {
              create: {
                eventType: "CREATED",
                description: "Booking created",
                actorUserId: session.user.id,
                actorRole: session.user.role,
              },
            },
          },
        });

        if (depositAmount > 0) {
          await tx.deposit.create({
            data: { bookingId: created.id, amount: depositAmount, status: "HELD" },
          });
        }

        for (const item of data.items) {
          const garment = await tx.garment.findUniqueOrThrow({ where: { id: item.garmentId } });
          await tx.garment.update({ where: { id: item.garmentId }, data: { currentStatus: "BOOKED" } });
          await tx.garmentStatusHistory.create({
            data: {
              garmentId: item.garmentId,
              fromStatus: garment.currentStatus,
              toStatus: "BOOKED",
              changedByUserId: session.user.id,
              changedByRole: session.user.role,
              notes: `Booked on ${created.bookingNumber}`,
            },
          });
        }

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    updateTag("dashboard");
    updateTag("calendar");
    updateTag("reports");
    revalidatePath("/dashboard/bookings");
    redirect(`/dashboard/bookings/${booking.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Could not create booking." };
  }
}
