import { db } from "@/lib/db";
import type { AvailabilityRisk } from "@prisma/client";

/**
 * The core operational-intelligence engine (spec section 8).
 *
 * A garment is never simply "available/unavailable". Safety to book depends
 * on the full chain: return -> inspection -> cleaning -> repair -> QC ->
 * buffer -> next booking. This module is the single place that computes
 * that chain; both the booking wizard and the Owner dashboard "At Risk"
 * panel call into it so the logic never drifts between the two surfaces.
 */

export interface AvailabilityResult {
  risk: AvailabilityRisk; // SAFE | TIGHT | UNSAFE
  reasons: string[];
  freeHoursBeforeNextBooking: number | null;
  requiredTurnaroundHours: number;
  conflictingBookingId: string | null;
}

export interface AvailabilityCheckInput {
  garmentId: string;
  proposedStart: Date;
  proposedEnd: Date;
  /** Exclude this booking's own items when re-checking an existing booking. */
  excludeBookingId?: string;
}

/** Shared threshold logic so the booking wizard and the dashboard "At Risk"
 * panel never disagree about what counts as TIGHT vs UNSAFE. */
export function classifyTurnaround(
  freeHours: number,
  requiredTurnaroundHours: number,
  tightThresholdHours: number
): AvailabilityRisk {
  if (freeHours < requiredTurnaroundHours) return "UNSAFE";
  if (freeHours < tightThresholdHours) return "TIGHT";
  return "SAFE";
}

/**
 * Hard conflict check: does any OTHER active booking already hold this
 * garment across an overlapping date range? This is the authoritative
 * guard called inside the create-booking transaction — UI-level risk
 * scoring is advisory, this is enforcement.
 */
export async function findOverlappingBooking(input: AvailabilityCheckInput) {
  const { garmentId, proposedStart, proposedEnd, excludeBookingId } = input;

  const overlappingItem = await db.bookingItem.findFirst({
    where: {
      garmentId,
      booking: {
        status: { in: ["DRAFT", "CONFIRMED", "IN_PROGRESS"] },
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        // overlap test: existing.start < proposed.end AND existing.end > proposed.start
        rentalStart: { lt: proposedEnd },
        rentalEnd: { gt: proposedStart },
      },
    },
    include: { booking: true },
  });

  return overlappingItem?.booking ?? null;
}

/**
 * Computes SAFE / TIGHT / UNSAFE for booking a garment in a proposed window,
 * factoring in the branch's configured turnaround buffers.
 */
export async function checkAvailability(
  input: AvailabilityCheckInput
): Promise<AvailabilityResult> {
  const { garmentId, proposedEnd } = input;
  const reasons: string[] = [];

  const garment = await db.garment.findUniqueOrThrow({
    where: { id: garmentId },
    include: { branch: { include: { settings: true } } },
  });

  const settings = garment.branch.settings;
  const requiredTurnaroundHours =
    (settings?.inspectionBufferHours ?? 2) +
    (settings?.cleaningBufferHours ?? 8) +
    (settings?.qualityCheckBufferHours ?? 1);
  const tightThresholdHours = settings?.tightThresholdHours ?? 24;

  // 1. Hard conflict — another active booking overlaps the proposed window.
  const conflict = await findOverlappingBooking(input);
  if (conflict) {
    reasons.push(
      `Garment is already booked ${conflict.bookingNumber} (${conflict.rentalStart.toDateString()} – ${conflict.rentalEnd.toDateString()}).`
    );
    return {
      risk: "UNSAFE",
      reasons,
      freeHoursBeforeNextBooking: null,
      requiredTurnaroundHours,
      conflictingBookingId: conflict.id,
    };
  }

  // 2. Find the next booking (if any) that starts after the proposed return,
  // to see how tight the turnaround is for whichever booking comes second.
  const nextBooking = await db.bookingItem.findFirst({
    where: {
      garmentId,
      booking: {
        status: { in: ["DRAFT", "CONFIRMED", "IN_PROGRESS"] },
        id: input.excludeBookingId ? { not: input.excludeBookingId } : undefined,
        rentalStart: { gte: proposedEnd },
      },
    },
    include: { booking: true },
    orderBy: { booking: { rentalStart: "asc" } },
  });

  if (!nextBooking) {
    return {
      risk: "SAFE",
      reasons: ["No upcoming booking follows this rental window."],
      freeHoursBeforeNextBooking: null,
      requiredTurnaroundHours,
      conflictingBookingId: null,
    };
  }

  const freeMs = nextBooking.booking.rentalStart.getTime() - proposedEnd.getTime();
  const freeHours = Math.max(0, Math.round(freeMs / (1000 * 60 * 60)));
  const risk = classifyTurnaround(freeHours, requiredTurnaroundHours, tightThresholdHours);

  if (risk === "UNSAFE") {
    reasons.push(
      `Only ${freeHours}h free before next booking ${nextBooking.booking.bookingNumber}, but inspection + cleaning + QC needs ~${requiredTurnaroundHours}h.`
    );
  } else if (risk === "TIGHT") {
    reasons.push(
      `Turnaround is tight: ${freeHours}h free before next booking ${nextBooking.booking.bookingNumber} (buffer target ${tightThresholdHours}h).`
    );
  } else {
    reasons.push(`${freeHours}h free before next booking ${nextBooking.booking.bookingNumber}.`);
  }

  return {
    risk,
    reasons,
    freeHoursBeforeNextBooking: freeHours,
    requiredTurnaroundHours,
    conflictingBookingId: null,
  };
}
