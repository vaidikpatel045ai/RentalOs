import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCachedBranches } from "@/lib/queries/branches";
import { getProfitLoss, type ProfitLossLine } from "@/lib/queries/profit-loss";
import { parseMonth } from "@/lib/month";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { KpiCard } from "@/components/domain/kpi-card";
import { MonthNav } from "@/components/domain/month-nav";
import { ProfitLossChart } from "@/components/domain/profit-loss-chart";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { enumLabel } from "@/lib/format-enum";
import { cn } from "@/lib/utils";
import { Percent, TrendingDown, TrendingUp, Wallet } from "lucide-react";

const COST_LABELS: Record<string, string> = {
  CLEANING_JOBS: "Cleaning (logged on jobs)",
  REPAIRS: "Repairs (logged on jobs)",
};

function StatementSection({
  title,
  lines,
  total,
  currency,
  emptyText,
}: {
  title: string;
  lines: ProfitLossLine[];
  total: number;
  currency: string;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {lines.length === 0 ? (
          <p className="text-muted-foreground">{emptyText}</p>
        ) : (
          lines.map((l) => (
            <div key={l.key} className="flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">{COST_LABELS[l.key] ?? enumLabel(l.key)}</span>
              <span className="tabular-nums">{formatMoney(l.amount, currency)}</span>
            </div>
          ))
        )}
        <div className="flex items-baseline justify-between gap-4 border-t pt-2 font-medium">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(total, currency)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; branchId?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "profitLoss", "view")) redirect("/dashboard");
  const isOwner = session.user.role === "OWNER";

  const month = parseMonth(params.month);
  const branches = await getCachedBranches(session.user.organizationId!);
  const allowedBranchIds = isOwner ? branches.map((b) => b.id) : session.user.branchId ? [session.user.branchId] : [];
  const selectedBranchId = isOwner && params.branchId && allowedBranchIds.includes(params.branchId) ? params.branchId : undefined;
  const branchIds = selectedBranchId ? [selectedBranchId] : allowedBranchIds;

  const data = await getProfitLoss({ branchIds, start: month.start, end: month.end });
  const currency = branches.find((b) => b.id === branchIds[0])?.currency ?? "AED";
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const isLoss = data.net < 0;

  const filters: FilterConfig[] = isOwner
    ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
    : [];

  return (
    <div className="space-y-6">
      <div data-tour="page-header">
        <h1 className="font-heading text-2xl">Profit &amp; Loss</h1>
        <p className="text-sm text-muted-foreground">
          What came in, what went out, and what was left for {month.label}.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4" data-tour="page-filters">
        {filters.length > 0 ? <FilterBar filters={filters} /> : <div />}
        <MonthNav basePath="/dashboard/profit-loss" month={month} params={params} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-tour="kpi-today">
        <KpiCard label="Income" value={formatMoneyCompact(data.income, currency)} icon={Wallet} />
        <KpiCard label="Expenses" value={formatMoneyCompact(data.costs, currency)} icon={TrendingDown} tone="warning" />
        <KpiCard
          label={isLoss ? "Net Loss" : "Net Profit"}
          value={formatMoneyCompact(data.net, currency)}
          icon={TrendingUp}
          tone={isLoss ? "danger" : "gold"}
        />
        <KpiCard
          label="Profit Margin"
          value={data.marginPct === null ? "—" : `${data.marginPct}%`}
          hint={data.marginPct === null ? "No income this month" : "Of every 100 earned"}
          icon={Percent}
          tone={isLoss ? "danger" : "default"}
        />
      </div>

      <Card data-tour="page-content">
        <CardHeader>
          <CardTitle className="font-heading text-base">Day by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfitLossChart daily={data.daily} currency={currency} monthLabel={month.label} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2" data-tour="page-secondary">
        <StatementSection
          title="Income"
          lines={data.incomeByType}
          total={data.income}
          currency={currency}
          emptyText="No payments received this month."
        />
        <StatementSection
          title="Expenses"
          lines={data.costsByCategory}
          total={data.costs}
          currency={currency}
          emptyText="No expenses recorded this month."
        />
      </div>

      {isOwner && !selectedBranchId && data.byBranch.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">By Branch</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byBranch.map((b) => (
                  <TableRow key={b.branchId}>
                    <TableCell>
                      <Link
                        href={`/dashboard/profit-loss?month=${month.key}&branchId=${b.branchId}`}
                        className="font-medium hover:underline"
                      >
                        {branchName.get(b.branchId) ?? "Branch"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(b.income, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(b.costs, currency)}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", b.net < 0 && "text-risk-unsafe")}>
                      {formatMoney(b.net, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Cash basis: income is payments received in the month. Security deposits are left out because they get refunded, and
        tax collected is left out because it&apos;s owed to the government. Expenses include everything on the{" "}
        <Link href="/dashboard/expenses" className="underline underline-offset-4">
          Expenses
        </Link>{" "}
        page plus cleaning and repair costs entered on completed jobs.
      </p>
    </div>
  );
}
