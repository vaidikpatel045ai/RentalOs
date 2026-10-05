import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getCachedBranches, getCachedBranchById } from "@/lib/queries/branches";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { KpiCard } from "@/components/domain/kpi-card";
import { MonthNav } from "@/components/domain/month-nav";
import { ExpenseDeleteControl } from "@/components/domain/expense-delete-control";
import { parsePagination } from "@/lib/pagination";
import { parseMonth } from "@/lib/month";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { enumLabel, enumOptions } from "@/lib/format-enum";
import { EXPENSE_CATEGORIES } from "@/lib/validations/expense";
import type { ExpenseCategory } from "@prisma/client";
import { Pencil, Plus, Receipt, Tags } from "lucide-react";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string; branchId?: string; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "expenses", "view")) redirect("/dashboard");
  const { role, organizationId } = session.user;
  const isOwner = role === "OWNER";

  const month = parseMonth(params.month);
  const pagination = parsePagination(params);
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(params.category ?? "")
    ? (params.category as ExpenseCategory)
    : undefined;

  const branches = await getCachedBranches(organizationId!);
  const allowedBranchIds = isOwner ? branches.map((b) => b.id) : session.user.branchId ? [session.user.branchId] : [];
  const scopedBranchIds =
    isOwner && params.branchId && allowedBranchIds.includes(params.branchId) ? [params.branchId] : allowedBranchIds;

  const where = {
    branchId: { in: scopedBranchIds },
    expenseDate: { gte: month.start, lt: month.end },
    ...(category ? { category } : {}),
  };

  const [expenses, totalCount, totalAgg, byCategory] = await Promise.all([
    db.expense.findMany({
      where,
      include: { branch: { select: { name: true, currency: true } }, recordedBy: { select: { name: true } } },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    db.expense.count({ where }),
    db.expense.aggregate({ where, _sum: { amount: true } }),
    db.expense.groupBy({ by: ["category"], where, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 1 }),
  ]);

  const ownBranch = !isOwner && session.user.branchId ? await getCachedBranchById(session.user.branchId) : null;
  const currency = ownBranch?.currency ?? branches.find((b) => b.id === scopedBranchIds[0])?.currency ?? "AED";
  const topCategory = byCategory[0];
  const canCreate = can(role, "expenses", "create");
  const canUpdate = can(role, "expenses", "update");
  const canDelete = can(role, "expenses", "delete");

  const filters: FilterConfig[] = [
    { key: "category", label: "Category", options: enumOptions(EXPENSE_CATEGORIES) },
    ...(isOwner ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div data-tour="page-header">
          <h1 className="font-heading text-2xl">Expenses</h1>
          <p className="text-sm text-muted-foreground">Rent, salaries, supplies and every other cost of running the boutique.</p>
        </div>
        {canCreate && (
          <Button asChild data-tour="page-action">
            <Link href="/dashboard/expenses/new">
              <Plus className="size-4" />
              Add Expense
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4" data-tour="page-filters">
        <FilterBar filters={filters} />
        <MonthNav basePath="/dashboard/expenses" month={month} params={params} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label={`Spent in ${month.label}`}
          value={formatMoneyCompact(totalAgg._sum.amount ?? 0, currency)}
          hint={`${totalCount} ${totalCount === 1 ? "expense" : "expenses"}`}
          icon={Receipt}
        />
        <KpiCard
          label="Biggest Category"
          value={topCategory ? enumLabel(topCategory.category) : "—"}
          hint={topCategory ? formatMoney(topCategory._sum.amount ?? 0, currency) : "Nothing recorded yet"}
          icon={Tags}
          tone="gold"
        />
      </div>

      <Card data-tour="page-content">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Paid To</TableHead>
                <TableHead>Method</TableHead>
                {isOwner && <TableHead>Branch</TableHead>}
                <TableHead>Recorded By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {(canUpdate || canDelete) && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No expenses recorded for {month.label}.
                    {canCreate && (
                      <>
                        {" "}
                        <Link href="/dashboard/expenses/new" className="font-medium text-foreground underline-offset-4 hover:underline">
                          Add the first one
                        </Link>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{format(e.expenseDate, "d MMM yyyy")}</TableCell>
                    <TableCell>
                      <div className="font-medium">{enumLabel(e.category)}</div>
                      {e.description && <div className="max-w-64 truncate text-xs text-muted-foreground">{e.description}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.vendor ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{enumLabel(e.paymentMethod)}</TableCell>
                    {isOwner && <TableCell className="text-muted-foreground">{e.branch.name}</TableCell>}
                    <TableCell className="text-muted-foreground">{e.recordedBy?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(e.amount, e.branch.currency)}</TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button asChild variant="ghost" size="icon-sm" aria-label="Edit expense">
                              <Link href={`/dashboard/expenses/${e.id}/edit`}>
                                <Pencil className="size-3.5" />
                              </Link>
                            </Button>
                          )}
                          {canDelete && (
                            <ExpenseDeleteControl
                              expenseId={e.id}
                              label={`${enumLabel(e.category)} of ${formatMoney(e.amount, e.branch.currency)}`}
                            />
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PaginationBar page={pagination.page} pageSize={pagination.pageSize} totalCount={totalCount} itemLabel="expenses" />
    </div>
  );
}
