import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import {
  getGarmentPerformance,
  getRevenueByCategory,
  getTopCustomers,
  getReportsSummary,
  DEAD_STOCK_IDLE_DAYS,
  DEAD_STOCK_MAX_RENTALS,
} from "@/lib/queries/reports";
import { KpiCard } from "@/components/domain/kpi-card";
import { CategoryRevenueChart } from "@/components/domain/category-revenue-chart";
import { BranchSwitcher } from "@/components/domain/branch-switcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { TrendingUp, TrendingDown, Percent, Wallet, AlertTriangle } from "lucide-react";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const { branchId: branchIdParam } = await searchParams;
  const branchId = isOwner ? branchIdParam : session?.user.branchId ?? undefined;

  const [branches, summary, performance, categoryRevenue, topCustomers] = await Promise.all([
    isOwner ? getCachedBranches() : Promise.resolve([]),
    getReportsSummary({ branchId }),
    getGarmentPerformance({ branchId }),
    getRevenueByCategory({ branchId }),
    getTopCustomers({ branchId }),
  ]);

  const currency = "AED";
  const topPerforming = [...performance].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const deadStock = performance
    .filter((g) => g.idleDays >= DEAD_STOCK_IDLE_DAYS && g.rentalCount <= DEAD_STOCK_MAX_RENTALS)
    .sort((a, b) => b.idleDays - a.idleDays)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Garment ROI, dead-stock intelligence and revenue breakdowns.</p>
        </div>
        {isOwner && <BranchSwitcher branches={branches} activeBranchId={branchId} basePath="/dashboard/reports" allowAll />}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Total Garments" value={summary.totalGarments} />
        <KpiCard label="Lifetime Revenue" value={formatMoneyCompact(summary.totalRevenue, currency)} icon={Wallet} tone="gold" />
        <KpiCard
          label="Avg Garment ROI"
          value={summary.avgROI !== null ? `${(summary.avgROI * 100).toFixed(0)}%` : "—"}
          icon={Percent}
        />
        <KpiCard label="Dead Stock" value={summary.deadStockCount} icon={AlertTriangle} tone={summary.deadStockCount > 0 ? "warning" : "default"} />
        <KpiCard label="Damage Charges" value={formatMoneyCompact(summary.damageChargeTotal, currency)} hint={`${summary.damageChargeCount} incidents`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryRevenueChart data={categoryRevenue} currency={currency} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <TrendingUp className="size-4 text-risk-safe" /> Top Performing Garments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Garment</TableHead>
                  <TableHead className="text-right">Rentals</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPerforming.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No data yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  topPerforming.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        <Link href={`/dashboard/garments/${g.id}`} className="font-medium hover:underline">
                          {g.sku}
                        </Link>
                        <p className="text-xs text-muted-foreground">{g.name}</p>
                      </TableCell>
                      <TableCell className="text-right">{g.rentalCount}</TableCell>
                      <TableCell className="text-right">{formatMoney(g.revenue, currency)}</TableCell>
                      <TableCell className="text-right font-medium text-risk-safe">
                        {g.roi !== null ? `${(g.roi * 100).toFixed(0)}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <TrendingDown className="size-4 text-risk-unsafe" /> Underperforming Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadStock.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No dead stock right now — nice work.</p>
            ) : (
              deadStock.map((g) => (
                <div key={g.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/dashboard/garments/${g.id}`} className="text-sm font-medium hover:underline">
                        {g.sku}
                      </Link>
                      <p className="text-xs text-muted-foreground">{g.name}</p>
                    </div>
                    <Badge variant="outline">UNDERPERFORMING</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>Invested: {formatMoney(g.purchaseCost, currency)}</span>
                    <span>{g.rentalCount} rentals</span>
                    <span>{g.idleDays} idle days</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-risk-tight">
                    {g.rentalCount === 0
                      ? "Recommendation: promote, discount or bundle to drive first bookings."
                      : "Recommendation: consider promotion or sale."}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Lifetime Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      No data yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  topCustomers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/dashboard/customers/${c.id}`} className="font-medium hover:underline">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{c.bookingCount}</TableCell>
                      <TableCell className="text-right">{formatMoney(c.totalSpend, currency)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Cost Breakdown</h2>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Cleaning Cost" value={formatMoneyCompact(summary.totalCleaningCost, currency)} />
          <KpiCard label="Repair Cost" value={formatMoneyCompact(summary.totalRepairCost, currency)} />
          <KpiCard label="Alteration Cost" value={formatMoneyCompact(summary.totalAlterationCost, currency)} />
        </div>
      </div>
    </div>
  );
}
