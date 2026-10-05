import Link from "next/link";
import { Download, Eye, Plus } from "lucide-react";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/domain/status-badge";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { parsePagination } from "@/lib/pagination";
import { formatMoney } from "@/lib/currency";
import { enumOptions } from "@/lib/format-enum";
import { BOOKING_STATUSES, PAYMENT_STATUSES } from "@/lib/validations/booking";
import type { BookingStatus, PaymentStatus } from "@prisma/client";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; paymentStatus?: string; branchId?: string; page?: string; pageSize?: string }>;
}) {
  const { q, status, paymentStatus, branchId, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const branches = isOwner ? await getCachedBranches(session!.user.organizationId!) : [];
  const allowedBranchIds = branches.map((b) => b.id);
  const branchWhere = session?.user.branchId && !isOwner
    ? { branchId: session.user.branchId }
    : branchId && allowedBranchIds.includes(branchId)
      ? { branchId }
      : { branchId: { in: allowedBranchIds } };

  const where = {
    ...branchWhere,
    ...(status ? { status: status as BookingStatus } : {}),
    ...(paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {}),
    ...(q
      ? {
          OR: [
            { bookingNumber: { contains: q, mode: "insensitive" as const } },
            { customer: { firstName: { contains: q, mode: "insensitive" as const } } },
            { customer: { lastName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [bookings, totalCount] = await Promise.all([
    db.booking.findMany({
      where,
      include: { customer: true, items: { include: { garment: true } }, branch: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.booking.count({ where }),
  ]);

  const filters: FilterConfig[] = [
    { key: "status", label: "Status", options: enumOptions(BOOKING_STATUSES) },
    { key: "paymentStatus", label: "Payment", options: enumOptions(PAYMENT_STATUSES) },
    ...(isOwner
      ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div data-tour="page-header">
          <h1 className="font-heading text-2xl">Bookings</h1>
          <p className="text-sm text-muted-foreground">{totalCount} total</p>
        </div>
        <Button asChild data-tour="page-action">
          <Link href="/dashboard/bookings/new">
            <Plus className="size-4" /> New Booking
          </Link>
        </Button>
      </div>

      <div data-tour="page-filters">
        <FilterBar searchKey="q" searchPlaceholder="Search booking # or customer…" filters={filters} />
      </div>

      <Card data-tour="page-content">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Garments</TableHead>
                <TableHead>Rental Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No bookings found.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link href={`/dashboard/bookings/${b.id}`} className="font-mono text-xs font-medium hover:underline">
                        {b.bookingNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {b.customer.firstName} {b.customer.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{b.items.map((i) => i.garment.sku).join(", ")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(b.rentalStart, "d MMM")} – {format(b.rentalEnd, "d MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={b.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={b.paymentStatus} />
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(b.totalAmount, b.branch.currency)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon-sm" title="View invoice">
                          <a
                            href={`/api/bookings/${b.id}/invoice`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View invoice for ${b.bookingNumber}`}
                          >
                            <Eye className="size-3.5" />
                          </a>
                        </Button>
                        <Button asChild variant="ghost" size="icon-sm" title="Download invoice">
                          <a
                            href={`/api/bookings/${b.id}/invoice?download=1`}
                            download
                            aria-label={`Download invoice for ${b.bookingNumber}`}
                          >
                            <Download className="size-3.5" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="bookings" />
    </div>
  );
}
