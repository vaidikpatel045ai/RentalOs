import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { differenceInDays } from "date-fns";

export interface ReportsFilter {
  branchId?: string;
}

/**
 * Reports change slowly compared to live operations (bookings/returns), so
 * a longer window than the dashboard's is fine — and worth it, since
 * `computeGarmentPerformance` below is the single worst-scaling query in
 * the app (it scans the *entire* garment status history table). Caching
 * doesn't fix that scaling problem, but it does mean it only runs once
 * every 5 minutes instead of on every page view.
 */
const REPORTS_REVALIDATE_SECONDS = 300;

export interface GarmentPerformanceRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  purchaseCost: number;
  totalCost: number;
  revenue: number;
  roi: number | null;
  rentalCount: number;
  idleDays: number;
  currentStatus: string;
}

async function computeGarmentPerformance(branchId?: string): Promise<GarmentPerformanceRow[]> {
  const branchWhere = branchId ? { branchId } : {};

  const [garments, history] = await Promise.all([
    db.garment.findMany({
      where: { ...branchWhere, isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        purchaseCost: true,
        cleaningCostTotal: true,
        repairCostTotal: true,
        alterationCostTotal: true,
        totalRentalRevenue: true,
        rentalCount: true,
        currentStatus: true,
        createdAt: true,
        branchId: true,
      },
    }),
    // TODO(scale): this reads every history row ever written for the
    // branch just to find each garment's most recent one. Fine at demo
    // scale; once history grows large, replace with a query that only
    // fetches the latest row per garment (e.g. a raw DISTINCT ON in
    // Postgres, or a denormalized `lastActivityAt` column on Garment
    // updated alongside garmentStatusHistory.create()).
    db.garmentStatusHistory.findMany({
      where: branchWhere.branchId ? { garment: { branchId: branchWhere.branchId } } : {},
      select: { garmentId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const lastActivityByGarment = new Map<string, Date>();
  for (const h of history) {
    lastActivityByGarment.set(h.garmentId, h.createdAt);
  }

  const now = new Date();
  return garments.map((g) => {
    const totalCost = Number(g.purchaseCost) + Number(g.cleaningCostTotal) + Number(g.repairCostTotal) + Number(g.alterationCostTotal);
    const revenue = Number(g.totalRentalRevenue);
    const roi = totalCost > 0 ? (revenue - totalCost) / totalCost : null;
    const lastActivity = lastActivityByGarment.get(g.id) ?? g.createdAt;
    return {
      id: g.id,
      sku: g.sku,
      name: g.name,
      category: g.category,
      purchaseCost: Number(g.purchaseCost),
      totalCost,
      revenue,
      roi,
      rentalCount: g.rentalCount,
      idleDays: Math.max(0, differenceInDays(now, lastActivity)),
      currentStatus: g.currentStatus,
    };
  });
}

const getCachedGarmentPerformance = unstable_cache(
  (branchKey: string) => computeGarmentPerformance(branchKey || undefined),
  ["garment-performance"],
  { revalidate: REPORTS_REVALIDATE_SECONDS, tags: ["reports"] }
);

/** Powers Top Performing / Underperforming (Dead Stock) tables — spec sections 20-21. */
export async function getGarmentPerformance(filter: ReportsFilter = {}): Promise<GarmentPerformanceRow[]> {
  return getCachedGarmentPerformance(filter.branchId ?? "");
}

export interface CategoryRevenueRow {
  category: string;
  revenue: number;
}

async function computeRevenueByCategory(branchId?: string): Promise<CategoryRevenueRow[]> {
  const branchWhere = branchId ? { branchId } : {};
  const garments = await db.garment.groupBy({
    by: ["category"],
    where: { ...branchWhere, isActive: true },
    _sum: { totalRentalRevenue: true },
  });
  return garments
    .map((g) => ({ category: g.category, revenue: Number(g._sum.totalRentalRevenue ?? 0) }))
    .sort((a, b) => b.revenue - a.revenue);
}

const getCachedRevenueByCategory = unstable_cache(
  (branchKey: string) => computeRevenueByCategory(branchKey || undefined),
  ["revenue-by-category"],
  { revalidate: REPORTS_REVALIDATE_SECONDS, tags: ["reports"] }
);

export async function getRevenueByCategory(filter: ReportsFilter = {}): Promise<CategoryRevenueRow[]> {
  return getCachedRevenueByCategory(filter.branchId ?? "");
}

export interface TopCustomerRow {
  id: string;
  name: string;
  bookingCount: number;
  totalSpend: number;
}

async function computeTopCustomers(branchId: string | undefined, limit: number): Promise<TopCustomerRow[]> {
  const branchWhere = branchId ? { branchId } : {};
  const grouped = await db.booking.groupBy({
    by: ["customerId"],
    where: branchWhere,
    _sum: { totalAmount: true },
    _count: { _all: true },
    orderBy: { _sum: { totalAmount: "desc" } },
    take: limit,
  });

  const customers = await db.customer.findMany({
    where: { id: { in: grouped.map((g) => g.customerId) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameById = new Map(customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

  return grouped.map((g) => ({
    id: g.customerId,
    name: nameById.get(g.customerId) ?? "Unknown",
    bookingCount: g._count._all,
    totalSpend: Number(g._sum.totalAmount ?? 0),
  }));
}

const getCachedTopCustomers = unstable_cache(
  (branchKey: string, limit: number) => computeTopCustomers(branchKey || undefined, limit),
  ["top-customers"],
  { revalidate: REPORTS_REVALIDATE_SECONDS, tags: ["reports"] }
);

export async function getTopCustomers(filter: ReportsFilter = {}, limit = 8): Promise<TopCustomerRow[]> {
  return getCachedTopCustomers(filter.branchId ?? "", limit);
}

export interface ReportsSummary {
  totalGarments: number;
  totalRevenue: number;
  avgROI: number | null;
  deadStockCount: number;
  totalCleaningCost: number;
  totalRepairCost: number;
  totalAlterationCost: number;
  damageChargeCount: number;
  damageChargeTotal: number;
}

const DEAD_STOCK_IDLE_DAYS = 60;
const DEAD_STOCK_MAX_RENTALS = 3;

async function computeReportsSummary(branchId?: string): Promise<ReportsSummary> {
  const branchWhere = branchId ? { branchId } : {};
  const [garments, damageAgg, performance] = await Promise.all([
    db.garment.findMany({
      where: { ...branchWhere, isActive: true },
      select: {
        purchaseCost: true,
        cleaningCostTotal: true,
        repairCostTotal: true,
        alterationCostTotal: true,
        totalRentalRevenue: true,
        rentalCount: true,
      },
    }),
    db.damageCharge.aggregate({
      where: { booking: branchWhere },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    computeGarmentPerformance(branchId),
  ]);

  const rois = performance.filter((g) => g.roi !== null).map((g) => g.roi as number);
  const deadStockCount = performance.filter(
    (g) => g.idleDays >= DEAD_STOCK_IDLE_DAYS && g.rentalCount <= DEAD_STOCK_MAX_RENTALS
  ).length;

  return {
    totalGarments: garments.length,
    totalRevenue: garments.reduce((sum, g) => sum + Number(g.totalRentalRevenue), 0),
    avgROI: rois.length > 0 ? rois.reduce((a, b) => a + b, 0) / rois.length : null,
    deadStockCount,
    totalCleaningCost: garments.reduce((sum, g) => sum + Number(g.cleaningCostTotal), 0),
    totalRepairCost: garments.reduce((sum, g) => sum + Number(g.repairCostTotal), 0),
    totalAlterationCost: garments.reduce((sum, g) => sum + Number(g.alterationCostTotal), 0),
    damageChargeCount: damageAgg._count._all,
    damageChargeTotal: Number(damageAgg._sum.amount ?? 0),
  };
}

const getCachedReportsSummary = unstable_cache(
  (branchKey: string) => computeReportsSummary(branchKey || undefined),
  ["reports-summary"],
  { revalidate: REPORTS_REVALIDATE_SECONDS, tags: ["reports"] }
);

export async function getReportsSummary(filter: ReportsFilter = {}): Promise<ReportsSummary> {
  return getCachedReportsSummary(filter.branchId ?? "");
}

export { DEAD_STOCK_IDLE_DAYS, DEAD_STOCK_MAX_RENTALS };
