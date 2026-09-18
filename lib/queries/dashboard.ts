import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { classifyTurnaround } from "@/lib/availability-engine";
import type { BookingStatus, PaymentType } from "@prisma/client";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  addDays,
} from "date-fns";

/** Optional branch scoping — Owner passes undefined to see all branches. */
export interface DashboardFilter {
  branchId?: string;
}

/**
 * The Owner/Manager "Command Center" is the single heaviest, most-frequently
 * -hit read path in the app (~25 parallel aggregate queries per load). It
 * doesn't need millisecond freshness — a 60s cache window is imperceptible
 * for a dashboard, and cuts DB load dramatically when several staff have it
 * open at once. Invalidated early via `revalidateTag("dashboard")` from the
 * mutation actions where staleness would actually be noticeable (bookings,
 * payments); otherwise it self-heals within the minute.
 */
const DASHBOARD_REVALIDATE_SECONDS = 60;

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["DRAFT", "CONFIRMED", "IN_PROGRESS"];
const REVENUE_PAYMENT_TYPES: PaymentType[] = [
  "RENTAL_FEE",
  "BALANCE",
  "ALTERATION_FEE",
  "CLEANING_FEE",
  "DELIVERY_FEE",
  "LATE_FEE",
  "DAMAGE_CHARGE",
];

async function computeOwnerDashboardData(branchId?: string) {
  const branchWhere = branchId ? { branchId } : {};
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [
    todayAppointments,
    todayTrials,
    todayPickups,
    todayReturns,
    alterationsDue,
    cleaningDue,
    overdueReturns,
    unpaidBookings,
    depositsHeldAgg,
    garmentsOut,
    garmentsInCleaning,
    garmentsInTailoring,
    revenueToday,
    revenueWeek,
    revenueMonth,
    revenueYear,
    totalGarments,
    activeGarments,
    bookingsCount,
    rentalFeeAgg,
    depositAgg,
    damageChargeCount,
    completedReturnsCount,
    cleaningJobsCompleted,
    tailoringJobsCompleted,
    garmentsForROI,
  ] = await Promise.all([
    db.appointment.count({
      where: { ...branchWhere, scheduledAt: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } },
    }),
    db.appointment.count({
      where: {
        ...branchWhere,
        scheduledAt: { gte: todayStart, lte: todayEnd },
        type: { in: ["FITTING", "ALTERATION_FITTING", "FINAL_FITTING"] },
        status: { not: "CANCELLED" },
      },
    }),
    db.booking.count({
      where: { ...branchWhere, pickupDate: { gte: todayStart, lte: todayEnd }, status: { in: ACTIVE_BOOKING_STATUSES } },
    }),
    db.booking.count({
      where: { ...branchWhere, returnDate: { gte: todayStart, lte: todayEnd }, status: { in: ACTIVE_BOOKING_STATUSES } },
    }),
    db.tailoringJob.count({
      where: { garment: branchWhere, dueAt: { lte: todayEnd }, status: { notIn: ["COMPLETED"] } },
    }),
    db.garmentCleaningJob.count({
      where: { garment: branchWhere, dueAt: { lte: todayEnd }, status: { notIn: ["COMPLETED", "READY"] } },
    }),
    db.booking.count({
      where: { ...branchWhere, returnDate: { lt: todayStart }, status: "IN_PROGRESS" },
    }),
    db.booking.aggregate({
      where: { ...branchWhere, paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] } },
      _sum: { balanceDue: true },
    }),
    db.deposit.aggregate({
      where: { booking: branchWhere, status: "HELD" },
      _sum: { amount: true },
    }),
    db.garment.count({ where: { ...branchWhere, currentStatus: { in: ["WITH_CUSTOMER", "OUT_FOR_DELIVERY"] } } }),
    db.garment.count({ where: { ...branchWhere, currentStatus: { in: ["CLEANING", "CLEANING_REQUIRED"] } } }),
    db.garment.count({ where: { ...branchWhere, currentStatus: { in: ["WITH_TAILOR", "ALTERATION_REQUIRED"] } } }),
    db.payment.aggregate({
      where: { booking: branchWhere, type: { in: [...REVENUE_PAYMENT_TYPES] }, paidAt: { gte: todayStart } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { booking: branchWhere, type: { in: [...REVENUE_PAYMENT_TYPES] }, paidAt: { gte: startOfWeek(now) } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { booking: branchWhere, type: { in: [...REVENUE_PAYMENT_TYPES] }, paidAt: { gte: startOfMonth(now) } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { booking: branchWhere, type: { in: [...REVENUE_PAYMENT_TYPES] }, paidAt: { gte: startOfYear(now) } },
      _sum: { amount: true },
    }),
    db.garment.count({ where: { ...branchWhere, isActive: true } }),
    db.garment.count({ where: { ...branchWhere, isActive: true, currentStatus: { not: "AVAILABLE" } } }),
    db.booking.count({ where: { ...branchWhere, status: { in: ACTIVE_BOOKING_STATUSES } } }),
    db.booking.aggregate({ where: branchWhere, _avg: { rentalFee: true } }),
    db.booking.aggregate({ where: branchWhere, _avg: { depositAmount: true } }),
    db.damageCharge.count({ where: { booking: branchWhere } }),
    db.booking.count({ where: { ...branchWhere, status: "COMPLETED" } }),
    db.garmentCleaningJob.findMany({
      where: { garment: branchWhere, status: "COMPLETED", startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
    }),
    db.tailoringJob.findMany({
      where: { garment: branchWhere, status: "COMPLETED", startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
    }),
    db.garment.findMany({
      where: { ...branchWhere, purchaseCost: { gt: 0 } },
      select: { purchaseCost: true, totalRentalRevenue: true, cleaningCostTotal: true, repairCostTotal: true, alterationCostTotal: true },
    }),
  ]);

  const avgHours = (rows: { startedAt: Date | null; completedAt: Date | null }[]) => {
    if (rows.length === 0) return null;
    const totalHours = rows.reduce((sum, r) => {
      if (!r.startedAt || !r.completedAt) return sum;
      return sum + (r.completedAt.getTime() - r.startedAt.getTime()) / (1000 * 60 * 60);
    }, 0);
    return totalHours / rows.length;
  };

  const avgROI = (() => {
    if (garmentsForROI.length === 0) return null;
    const rois = garmentsForROI.map((g) => {
      const cost = Number(g.purchaseCost) + Number(g.cleaningCostTotal) + Number(g.repairCostTotal) + Number(g.alterationCostTotal);
      const revenue = Number(g.totalRentalRevenue);
      return cost > 0 ? (revenue - cost) / cost : 0;
    });
    return rois.reduce((a, b) => a + b, 0) / rois.length;
  })();

  return {
    today: {
      appointments: todayAppointments,
      trials: todayTrials,
      pickups: todayPickups,
      returns: todayReturns,
    },
    alterationsDue,
    cleaningDue,
    overdueReturns,
    pendingPaymentsAmount: Number(unpaidBookings._sum.balanceDue ?? 0),
    depositsHeldAmount: Number(depositsHeldAgg._sum.amount ?? 0),
    garmentsOut,
    garmentsInCleaning,
    garmentsInTailoring,
    revenue: {
      today: Number(revenueToday._sum.amount ?? 0),
      week: Number(revenueWeek._sum.amount ?? 0),
      month: Number(revenueMonth._sum.amount ?? 0),
      year: Number(revenueYear._sum.amount ?? 0),
    },
    kpis: {
      garmentUtilizationPct: totalGarments > 0 ? (activeGarments / totalGarments) * 100 : 0,
      bookingRatePct: totalGarments > 0 ? (bookingsCount / totalGarments) * 100 : 0,
      avgRentalValue: Number(rentalFeeAgg._avg.rentalFee ?? 0),
      avgDeposit: Number(depositAgg._avg.depositAmount ?? 0),
      lateReturnRatePct: completedReturnsCount > 0 ? (overdueReturns / completedReturnsCount) * 100 : 0,
      damageRatePct: completedReturnsCount > 0 ? (damageChargeCount / completedReturnsCount) * 100 : 0,
      cleaningTurnaroundHours: avgHours(cleaningJobsCompleted),
      tailoringTurnaroundHours: avgHours(tailoringJobsCompleted),
      avgGarmentROI: avgROI,
    },
  };
}

const getCachedOwnerDashboardData = unstable_cache(
  (branchKey: string) => computeOwnerDashboardData(branchKey || undefined),
  ["owner-dashboard-data"],
  { revalidate: DASHBOARD_REVALIDATE_SECONDS, tags: ["dashboard"] }
);

/** Public entry point — same signature as before caching was added, so
 * every call site (Owner/Manager dashboard pages) needed no changes. */
export async function getOwnerDashboardData(filter: DashboardFilter = {}) {
  return getCachedOwnerDashboardData(filter.branchId ?? "");
}

export interface AtRiskItem {
  garmentSku: string;
  garmentName: string;
  garmentId: string;
  currentBookingNumber: string;
  currentBookingId: string;
  returnDate: Date;
  nextBookingNumber: string;
  nextBookingId: string;
  nextBookingStart: Date;
  freeHours: number;
  risk: "TIGHT" | "UNSAFE";
  reason: string;
}

// unstable_cache's storage isn't guaranteed to round-trip Date instances,
// so the cached shape carries ISO strings and the public wrapper below
// revives them — callers still see real Date objects, unchanged.
type AtRiskItemCached = Omit<AtRiskItem, "returnDate" | "nextBookingStart"> & {
  returnDate: string;
  nextBookingStart: string;
};

/** Powers the Owner dashboard "AT RISK" panel (spec section 5). */
async function computeAtRiskBookings(branchId?: string): Promise<AtRiskItemCached[]> {
  const branchWhere = branchId ? { branchId } : {};
  const now = new Date();
  const horizon = addDays(now, 3);

  const soonToReturn = await db.bookingItem.findMany({
    where: {
      garment: branchWhere,
      booking: {
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        rentalEnd: { lte: horizon },
      },
    },
    include: {
      garment: { include: { branch: { include: { settings: true } } } },
      booking: true,
    },
    distinct: ["garmentId"],
  });

  const results: AtRiskItemCached[] = [];

  for (const item of soonToReturn) {
    const nextItem = await db.bookingItem.findFirst({
      where: {
        garmentId: item.garmentId,
        booking: {
          status: { in: ["DRAFT", "CONFIRMED", "IN_PROGRESS"] },
          id: { not: item.bookingId },
          rentalStart: { gte: item.booking.rentalEnd },
        },
      },
      include: { booking: true },
      orderBy: { booking: { rentalStart: "asc" } },
    });

    if (!nextItem) continue;

    const settings = item.garment.branch.settings;
    const requiredTurnaroundHours =
      (settings?.inspectionBufferHours ?? 2) + (settings?.cleaningBufferHours ?? 8) + (settings?.qualityCheckBufferHours ?? 1);
    const tightThresholdHours = settings?.tightThresholdHours ?? 24;

    const freeHours = Math.max(
      0,
      Math.round((nextItem.booking.rentalStart.getTime() - item.booking.rentalEnd.getTime()) / (1000 * 60 * 60))
    );
    const risk = classifyTurnaround(freeHours, requiredTurnaroundHours, tightThresholdHours);
    if (risk === "SAFE") continue;

    results.push({
      garmentSku: item.garment.sku,
      garmentName: item.garment.name,
      garmentId: item.garmentId,
      currentBookingNumber: item.booking.bookingNumber,
      currentBookingId: item.bookingId,
      returnDate: item.booking.rentalEnd.toISOString(),
      nextBookingNumber: nextItem.booking.bookingNumber,
      nextBookingId: nextItem.bookingId,
      nextBookingStart: nextItem.booking.rentalStart.toISOString(),
      freeHours,
      risk,
      reason:
        risk === "UNSAFE"
          ? `Only ${freeHours}h before next booking, needs ~${requiredTurnaroundHours}h turnaround.`
          : `Tight: ${freeHours}h before next booking (target ${tightThresholdHours}h).`,
    });
  }

  return results.sort((a, b) => (a.risk === "UNSAFE" ? -1 : 1) - (b.risk === "UNSAFE" ? -1 : 1));
}

const getCachedAtRiskBookings = unstable_cache(
  (branchKey: string) => computeAtRiskBookings(branchKey || undefined),
  ["at-risk-bookings"],
  { revalidate: DASHBOARD_REVALIDATE_SECONDS, tags: ["dashboard"] }
);

export async function getAtRiskBookings(filter: DashboardFilter = {}): Promise<AtRiskItem[]> {
  const rows = await getCachedAtRiskBookings(filter.branchId ?? "");
  return rows.map((r) => ({
    ...r,
    returnDate: new Date(r.returnDate),
    nextBookingStart: new Date(r.nextBookingStart),
  }));
}
