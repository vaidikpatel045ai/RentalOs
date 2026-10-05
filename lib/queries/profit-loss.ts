import { unstable_cache } from "next/cache";
import type { PaymentType } from "@prisma/client";
import { db } from "@/lib/db";

/** Money the boutique actually earned. Deposits are held and refunded (a
 * liability, not income), tax is owed to the government, and refunds and
 * discounts aren't money in, so none of those count. */
export const INCOME_PAYMENT_TYPES: PaymentType[] = [
  "RENTAL_FEE",
  "ADVANCE",
  "BALANCE",
  "ALTERATION_FEE",
  "CLEANING_FEE",
  "DELIVERY_FEE",
  "LATE_FEE",
  "DAMAGE_CHARGE",
];

export interface ProfitLossLine {
  key: string;
  amount: number;
}

export interface ProfitLossBranchRow {
  branchId: string;
  income: number;
  costs: number;
  net: number;
}

export interface ProfitLossData {
  income: number;
  incomeByType: ProfitLossLine[];
  costs: number;
  /** Expense categories, plus "CLEANING_JOBS" / "REPAIRS" for costs logged on jobs. */
  costsByCategory: ProfitLossLine[];
  net: number;
  /** Net as a percentage of income, or null when there's no income to divide by. */
  marginPct: number | null;
  daily: { day: number; income: number; costs: number }[];
  byBranch: ProfitLossBranchRow[];
}

function sumInto(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function toLines(map: Map<string, number>): ProfitLossLine[] {
  return [...map.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([key, amount]) => ({ key, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
}

async function computeProfitLoss(branchIds: string[], startIso: string, endIso: string): Promise<ProfitLossData> {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const range = { gte: start, lt: end };

  const [payments, expenses, cleaningJobs, repairs] = await Promise.all([
    db.payment.findMany({
      where: { status: "COMPLETED", type: { in: INCOME_PAYMENT_TYPES }, paidAt: range, booking: { branchId: { in: branchIds } } },
      select: { amount: true, type: true, paidAt: true, booking: { select: { branchId: true } } },
    }),
    db.expense.findMany({
      where: { branchId: { in: branchIds }, expenseDate: range },
      select: { amount: true, category: true, expenseDate: true, branchId: true },
    }),
    db.garmentCleaningJob.findMany({
      where: { completedAt: range, cost: { gt: 0 }, garment: { branchId: { in: branchIds } } },
      select: { cost: true, completedAt: true, garment: { select: { branchId: true } } },
    }),
    db.garmentRepair.findMany({
      where: { completedAt: range, cost: { gt: 0 }, garment: { branchId: { in: branchIds } } },
      select: { cost: true, completedAt: true, garment: { select: { branchId: true } } },
    }),
  ]);

  const incomeByType = new Map<string, number>();
  const costsByCategory = new Map<string, number>();
  const branchIncome = new Map<string, number>();
  const branchCosts = new Map<string, number>();
  const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, income: 0, costs: 0 }));
  const dayIndex = (d: Date) => Math.min(days - 1, Math.max(0, d.getUTCDate() - 1));

  for (const p of payments) {
    const amount = Number(p.amount);
    sumInto(incomeByType, p.type, amount);
    sumInto(branchIncome, p.booking.branchId, amount);
    daily[dayIndex(p.paidAt)].income += amount;
  }

  const costRows = [
    ...expenses.map((e) => ({ key: e.category as string, amount: Number(e.amount), date: e.expenseDate, branchId: e.branchId })),
    ...cleaningJobs.map((j) => ({ key: "CLEANING_JOBS", amount: Number(j.cost), date: j.completedAt!, branchId: j.garment.branchId })),
    ...repairs.map((r) => ({ key: "REPAIRS", amount: Number(r.cost), date: r.completedAt!, branchId: r.garment.branchId })),
  ];
  for (const c of costRows) {
    sumInto(costsByCategory, c.key, c.amount);
    sumInto(branchCosts, c.branchId, c.amount);
    daily[dayIndex(c.date)].costs += c.amount;
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  const income = round([...incomeByType.values()].reduce((a, b) => a + b, 0));
  const costs = round([...costsByCategory.values()].reduce((a, b) => a + b, 0));
  const net = round(income - costs);

  return {
    income,
    incomeByType: toLines(incomeByType),
    costs,
    costsByCategory: toLines(costsByCategory),
    net,
    marginPct: income > 0 ? Math.round((net / income) * 1000) / 10 : null,
    daily: daily.map((d) => ({ day: d.day, income: round(d.income), costs: round(d.costs) })),
    byBranch: branchIds.map((branchId) => {
      const bIncome = round(branchIncome.get(branchId) ?? 0);
      const bCosts = round(branchCosts.get(branchId) ?? 0);
      return { branchId, income: bIncome, costs: bCosts, net: round(bIncome - bCosts) };
    }),
  };
}

// Payments and job completions invalidate "dashboard", expenses "profit-loss".
const getCachedProfitLoss = unstable_cache(computeProfitLoss, ["profit-loss-v1"], {
  revalidate: 300,
  tags: ["profit-loss", "dashboard", "reports"],
});

/** `branchIds` must already be limited to branches the viewer may see. */
export function getProfitLoss({ branchIds, start, end }: { branchIds: string[]; start: Date; end: Date }) {
  return getCachedProfitLoss([...branchIds].sort(), start.toISOString(), end.toISOString());
}
