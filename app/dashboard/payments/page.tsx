import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { parsePagination } from "@/lib/pagination";
import { RefundDepositDialog } from "@/components/domain/refund-deposit-dialog";
import { KpiCard } from "@/components/domain/kpi-card";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { enumOptions } from "@/lib/format-enum";
import { PAYMENT_TYPES, TRANSACTION_METHODS, DEPOSIT_STATUSES } from "@/lib/validations/payment";
import type { DepositStatus, PaymentType, TransactionMethod } from "@prisma/client";
import { Wallet, ShieldCheck } from "lucide-react";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    method?: string;
    depositStatus?: string;
    branchId?: string;
    paymentsPage?: string;
    paymentsPageSize?: string;
    depositsPage?: string;
    depositsPageSize?: string;
  }>;
}) {
  const { type, method, depositStatus, branchId, paymentsPage, paymentsPageSize, depositsPage, depositsPageSize } = await searchParams;
  const paymentsPagination = parsePagination({ page: paymentsPage, pageSize: paymentsPageSize });
  const depositsPagination = parsePagination({ page: depositsPage, pageSize: depositsPageSize });
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const branchWhere = session?.user.branchId && !isOwner ? { booking: { branchId: session.user.branchId } } : branchId ? { booking: { branchId } } : {};

  const paymentsWhere = {
    ...branchWhere,
    ...(type ? { type: type as PaymentType } : {}),
    ...(method ? { method: method as TransactionMethod } : {}),
  };
  const depositsWhere = {
    booking: branchWhere.booking,
    ...(depositStatus ? { status: depositStatus as DepositStatus } : {}),
  };

  const [payments, paymentsTotal, deposits, depositsTotal, branches, totalCollectedAgg, depositsHeldAgg] = await Promise.all([
    db.payment.findMany({
      where: paymentsWhere,
      include: { booking: { include: { customer: true, branch: true } }, receivedBy: true },
      orderBy: { paidAt: "desc" },
      skip: paymentsPagination.skip,
      take: paymentsPagination.take,
    }),
    db.payment.count({ where: paymentsWhere }),
    db.deposit.findMany({
      where: depositsWhere,
      include: { booking: { include: { customer: true, branch: true } } },
      orderBy: { heldAt: "desc" },
      skip: depositsPagination.skip,
      take: depositsPagination.take,
    }),
    db.deposit.count({ where: depositsWhere }),
    isOwner ? getCachedBranches() : Promise.resolve([]),
    db.payment.aggregate({ where: branchWhere, _sum: { amount: true } }),
    db.deposit.aggregate({ where: { booking: branchWhere.booking, status: "HELD" }, _sum: { amount: true } }),
  ]);

  const paymentFilters: FilterConfig[] = [
    { key: "type", label: "Type", options: enumOptions(PAYMENT_TYPES) },
    { key: "method", label: "Method", options: enumOptions(TRANSACTION_METHODS) },
    ...(isOwner
      ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
      : []),
  ];
  const depositFilters: FilterConfig[] = [{ key: "depositStatus", label: "Status", options: enumOptions(DEPOSIT_STATUSES) }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Payments</h1>
        <p className="text-sm text-muted-foreground">All transactions and deposits across your bookings.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <KpiCard label="Total Collected" value={formatMoneyCompact(totalCollectedAgg._sum.amount ?? 0)} icon={Wallet} />
        <KpiCard label="Deposits Held" value={formatMoneyCompact(depositsHeldAgg._sum.amount ?? 0)} icon={ShieldCheck} tone="gold" />
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Payments ({paymentsTotal})</TabsTrigger>
          <TabsTrigger value="deposits">Deposits ({depositsTotal})</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <FilterBar filters={paymentFilters} />
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                        No payments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link href={`/dashboard/bookings/${p.bookingId}`} className="font-mono text-xs font-medium hover:underline">
                            {p.booking.bookingNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.booking.customer.firstName} {p.booking.customer.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.type.replaceAll("_", " ")}</TableCell>
                        <TableCell className="text-muted-foreground">{p.method.replaceAll("_", " ")}</TableCell>
                        <TableCell className="text-muted-foreground">{p.receivedBy?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{format(p.paidAt, "d MMM yyyy")}</TableCell>
                        <TableCell className="text-right">{formatMoney(p.amount, p.booking.branch.currency)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <PaginationBar
            page={paymentsPagination.page}
            pageSize={paymentsPagination.pageSize}
            totalCount={paymentsTotal}
            itemLabel="payments"
            pageParam="paymentsPage"
            pageSizeParam="paymentsPageSize"
          />
        </TabsContent>

        <TabsContent value="deposits" className="space-y-4">
          <FilterBar filters={depositFilters} />
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Held</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Refunded</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                        No deposits found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deposits.map((d) => {
                      const remaining = Number(d.amount) - Number(d.refundedAmount);
                      return (
                        <TableRow key={d.id}>
                          <TableCell>
                            <Link href={`/dashboard/bookings/${d.bookingId}`} className="font-mono text-xs font-medium hover:underline">
                              {d.booking.bookingNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {d.booking.customer.firstName} {d.booking.customer.lastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{format(d.heldAt, "d MMM yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={d.status === "HELD" ? "secondary" : "outline"}>{d.status.replaceAll("_", " ")}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatMoney(d.amount, d.booking.branch.currency)}</TableCell>
                          <TableCell className="text-right">{formatMoney(d.refundedAmount, d.booking.branch.currency)}</TableCell>
                          <TableCell className="text-right">
                            {remaining > 0 ? <RefundDepositDialog depositId={d.id} remaining={remaining} /> : null}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <PaginationBar
            page={depositsPagination.page}
            pageSize={depositsPagination.pageSize}
            totalCount={depositsTotal}
            itemLabel="deposits"
            pageParam="depositsPage"
            pageSizeParam="depositsPageSize"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
