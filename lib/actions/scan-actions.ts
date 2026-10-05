"use server";

import { revalidatePath, updateTag } from "next/cache";
import { differenceInCalendarDays, format } from "date-fns";
import type { GarmentStatus, Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/currency";

type SessionUser = { id: string; role: Role; branchId: string | null; organizationId: string | null };

/** Garment statuses that mean "the customer has it". */
const OUT_STATUSES: GarmentStatus[] = ["WITH_CUSTOMER", "OUT_FOR_DELIVERY"];

/** Statuses where the garment isn't ready to hand over. */
const NOT_READY: Partial<Record<GarmentStatus, string>> = {
  ALTERATION_REQUIRED: "still needs alterations",
  WITH_TAILOR: "with the tailor",
  RETURNED: "just returned and waiting to be processed",
  DAMAGE_INSPECTION: "waiting for a damage inspection",
  CLEANING_REQUIRED: "waiting to be cleaned",
  CLEANING: "being cleaned",
  QUALITY_CHECK: "in quality check",
  REPAIR_REQUIRED: "waiting for repair",
  UNDER_REPAIR: "under repair",
  OUT_OF_SERVICE: "out of service",
  DAMAGED: "marked as damaged",
  LOST: "marked as lost",
  SOLD: "sold",
  ARCHIVED: "archived",
};

function notReadyReason(status: GarmentStatus): string | null {
  const why = NOT_READY[status];
  return why ? `This garment is ${why}, so it can't be checked out yet.` : null;
}

export interface ScanBooking {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  rentalWindow: string;
  status: string;
  balanceDue: number;
  balanceDueLabel: string;
  /** Positive when the return is overdue. */
  daysLate: number;
}

export type ScanResult =
  | {
      ok: true;
      garment: { id: string; sku: string; name: string; status: GarmentStatus; imageUrl: string | null; branchName: string };
      /** What the scan can do next for this garment. */
      mode: "check-out" | "check-in" | "none";
      booking: ScanBooking | null;
      /** Why nothing can be done (mode "none"). */
      reason: string | null;
      canAct: boolean;
    }
  | { ok: false; error: string };

export type ScanActionResult = { ok: true; message: string; allReturned?: boolean } | { ok: false; error: string };

/** "garment:BR-102" (our QR), a bare SKU typed or scanned by a handheld
 * scanner, or a garment page link all resolve to the SKU / id. */
function parseCode(raw: string): { sku?: string; id?: string } {
  const code = raw.trim();
  const link = code.match(/\/dashboard\/garments\/([a-z0-9]+)/i);
  if (link) return { id: link[1] };
  return { sku: code.replace(/^garment:/i, "").trim().toUpperCase() };
}

function inScope(user: SessionUser, garmentBranchId: string, garmentOrgId: string, bookingBranchId?: string) {
  if (!user.organizationId || garmentOrgId !== user.organizationId) return false;
  if (user.role === "OWNER" || !user.branchId) return true;
  return garmentBranchId === user.branchId || bookingBranchId === user.branchId;
}

function toScanBooking(b: {
  id: string;
  bookingNumber: string;
  status: string;
  rentalStart: Date;
  rentalEnd: Date;
  returnDate: Date | null;
  balanceDue: unknown;
  customer: { firstName: string; lastName: string; phone: string };
  branch: { currency: string };
}): ScanBooking {
  const returnBy = b.returnDate ?? b.rentalEnd;
  const balance = Number(b.balanceDue);
  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    customerName: `${b.customer.firstName} ${b.customer.lastName}`,
    customerPhone: b.customer.phone,
    rentalWindow: `${format(b.rentalStart, "d MMM")} – ${format(b.rentalEnd, "d MMM yyyy")}`,
    status: b.status,
    balanceDue: balance,
    balanceDueLabel: formatMoney(balance, b.branch.currency),
    daysLate: Math.max(0, differenceInCalendarDays(new Date(), returnBy)),
  };
}

const bookingSelect = {
  id: true,
  bookingNumber: true,
  status: true,
  branchId: true,
  rentalStart: true,
  rentalEnd: true,
  returnDate: true,
  balanceDue: true,
  customer: { select: { firstName: true, lastName: true, phone: true } },
  branch: { select: { currency: true } },
} as const;

/** The booking this garment is going out on: confirmed or in progress,
 * not already over, not one it has already come back from, earliest start
 * first. Check-in/out events store the garment id in `newValue`. */
async function findCheckOutBooking(garmentId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return db.booking.findFirst({
    where: {
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      rentalEnd: { gte: today },
      items: { some: { garmentId } },
      events: { none: { eventType: "GARMENT_CHECKED_IN", newValue: garmentId } },
    },
    orderBy: { rentalStart: "asc" },
    select: bookingSelect,
  });
}

/** The booking the customer has this garment on: the in-progress one, or
 * failing that the most recent confirmed one that has started. */
async function findCheckInBooking(garmentId: string) {
  return db.booking.findFirst({
    where: {
      status: { in: ["IN_PROGRESS", "CONFIRMED"] },
      rentalStart: { lte: new Date() },
      items: { some: { garmentId } },
    },
    orderBy: [{ status: "desc" }, { rentalStart: "desc" }],
    select: bookingSelect,
  });
}

export async function lookupScannedCode(code: string): Promise<ScanResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  if (!can(session.user.role, "bookings", "view")) return { ok: false, error: "You don't have access to scanning." };

  const { sku, id } = parseCode(code);
  if (!sku && !id) return { ok: false, error: "That code is empty." };

  const garment = await db.garment.findFirst({
    where: {
      ...(id ? { id } : { sku }),
      branch: { organizationId: session.user.organizationId ?? "__none__" },
    },
    include: {
      branch: { select: { name: true, organizationId: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }], take: 1 },
    },
  });
  if (!garment) return { ok: false, error: `No garment found for "${code.trim()}".` };

  const isOut = OUT_STATUSES.includes(garment.currentStatus);
  const booking = isOut ? await findCheckInBooking(garment.id) : await findCheckOutBooking(garment.id);
  if (!inScope(session.user, garment.branchId, garment.branch.organizationId, booking?.branchId)) {
    return { ok: false, error: `No garment found for "${code.trim()}".` };
  }

  let mode: "check-out" | "check-in" | "none" = "none";
  let reason: string | null = null;
  if (isOut) {
    mode = "check-in";
  } else if (notReadyReason(garment.currentStatus)) {
    reason = notReadyReason(garment.currentStatus);
  } else if (!booking) {
    reason = "This garment has no confirmed booking coming up, so there's nothing to check out.";
  } else {
    mode = "check-out";
  }

  return {
    ok: true,
    garment: {
      id: garment.id,
      sku: garment.sku,
      name: garment.name,
      status: garment.currentStatus,
      imageUrl: garment.images[0]?.url ?? null,
      branchName: garment.branch.name,
    },
    mode,
    booking: booking ? toScanBooking(booking) : null,
    reason,
    canAct: can(session.user.role, "bookings", "update"),
  };
}

async function loadForAction(user: SessionUser, garmentId: string, bookingId: string | null) {
  const garment = await db.garment.findUnique({
    where: { id: garmentId },
    include: { branch: { select: { organizationId: true } } },
  });
  const booking = bookingId ? await db.booking.findUnique({ where: { id: bookingId }, select: { ...bookingSelect, items: { select: { garmentId: true } } } }) : null;
  if (!garment || (bookingId && !booking)) return null;
  if (booking && !booking.items.some((i) => i.garmentId === garmentId)) return null;
  if (!inScope(user, garment.branchId, garment.branch.organizationId, booking?.branchId)) return null;
  return { garment, booking };
}

function refresh(garmentId: string, bookingId: string | null) {
  updateTag("dashboard");
  updateTag("calendar");
  revalidatePath("/dashboard/scan");
  revalidatePath(`/dashboard/garments/${garmentId}`);
  revalidatePath("/dashboard/garments");
  if (bookingId) revalidatePath(`/dashboard/bookings/${bookingId}`);
}

/** Hands the garment to the customer: WITH_CUSTOMER, and the booking moves
 * to In Progress if it was only Confirmed. */
export async function checkOutGarment(garmentId: string, bookingId: string): Promise<ScanActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  if (!can(session.user.role, "bookings", "update")) return { ok: false, error: "You don't have permission to check garments out." };

  const loaded = await loadForAction(session.user, garmentId, bookingId);
  if (!loaded?.booking) return { ok: false, error: "Garment or booking not found." };
  const { garment, booking } = loaded;
  if (OUT_STATUSES.includes(garment.currentStatus)) return { ok: false, error: `${garment.sku} is already checked out.` };
  const notReady = notReadyReason(garment.currentStatus);
  if (notReady) return { ok: false, error: notReady };

  await db.$transaction(async (tx) => {
    await tx.garment.update({ where: { id: garmentId }, data: { currentStatus: "WITH_CUSTOMER" } });
    await tx.garmentStatusHistory.create({
      data: {
        garmentId,
        fromStatus: garment.currentStatus,
        toStatus: "WITH_CUSTOMER",
        changedByUserId: session.user.id,
        changedByRole: session.user.role,
        notes: `Checked out by QR scan for ${booking.bookingNumber}`,
      },
    });
    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        eventType: "GARMENT_CHECKED_OUT",
        description: `${garment.sku} checked out to the customer (QR scan)`,
        actorUserId: session.user.id,
        actorRole: session.user.role,
        newValue: garmentId,
      },
    });
    if (booking.status === "CONFIRMED") {
      await tx.booking.update({ where: { id: booking.id }, data: { status: "IN_PROGRESS" } });
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          eventType: "STATUS_CHANGE",
          description: "Status changed from CONFIRMED to IN_PROGRESS",
          actorUserId: session.user.id,
          actorRole: session.user.role,
          oldValue: "CONFIRMED",
          newValue: "IN_PROGRESS",
        },
      });
    }
  });

  refresh(garmentId, booking.id);
  return { ok: true, message: `${garment.sku} checked out to ${booking.customer.firstName} ${booking.customer.lastName}.` };
}

/** Takes the garment back. It's recorded as RETURNED, then queued for
 * cleaning, or for a damage inspection if staff flag a problem. */
export async function checkInGarment(
  garmentId: string,
  bookingId: string | null,
  outcome: "cleaning" | "inspection"
): Promise<ScanActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  if (!can(session.user.role, "bookings", "update")) return { ok: false, error: "You don't have permission to check garments in." };

  const loaded = await loadForAction(session.user, garmentId, bookingId);
  if (!loaded) return { ok: false, error: "Garment or booking not found." };
  const { garment, booking } = loaded;
  if (!OUT_STATUSES.includes(garment.currentStatus)) return { ok: false, error: `${garment.sku} isn't checked out.` };

  const next: GarmentStatus = outcome === "inspection" ? "DAMAGE_INSPECTION" : "CLEANING_REQUIRED";
  const lateDays = booking ? toScanBooking(booking).daysLate : 0;
  const lateNote = lateDays > 0 ? ` (${lateDays} day${lateDays === 1 ? "" : "s"} late)` : "";

  await db.$transaction(async (tx) => {
    await tx.garment.update({ where: { id: garmentId }, data: { currentStatus: next } });
    await tx.garmentStatusHistory.createMany({
      data: [
        {
          garmentId,
          fromStatus: garment.currentStatus,
          toStatus: "RETURNED",
          changedByUserId: session.user.id,
          changedByRole: session.user.role,
          notes: `Checked in by QR scan${booking ? ` from ${booking.bookingNumber}` : ""}${lateNote}`,
        },
        {
          garmentId,
          fromStatus: "RETURNED",
          toStatus: next,
          changedByUserId: session.user.id,
          changedByRole: session.user.role,
          notes: outcome === "inspection" ? "Flagged for damage inspection at check-in" : "Sent to cleaning at check-in",
        },
      ],
    });
    if (booking) {
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          eventType: "GARMENT_CHECKED_IN",
          description: `${garment.sku} checked in (QR scan)${lateNote}${outcome === "inspection" ? ", flagged for damage inspection" : ""}`,
          actorUserId: session.user.id,
          actorRole: session.user.role,
          newValue: garmentId,
        },
      });
    }
  });

  let allReturned = false;
  if (booking) {
    const stillOut = await db.garment.count({
      where: { id: { in: booking.items.map((i) => i.garmentId) }, currentStatus: { in: OUT_STATUSES } },
    });
    allReturned = stillOut === 0;
  }

  refresh(garmentId, booking?.id ?? null);
  return {
    ok: true,
    message: `${garment.sku} checked in${lateNote}${outcome === "inspection" ? " and flagged for inspection" : " and sent to cleaning"}.`,
    allReturned,
  };
}
