import Link from "next/link";
import { format } from "date-fns";
import { Plus, Truck } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { parsePagination } from "@/lib/pagination";
import { DeliveryStatusSelect } from "@/components/domain/job-status-select";
import { enumOptions } from "@/lib/format-enum";
import { DELIVERY_METHODS, DELIVERY_STATUSES } from "@/lib/validations/job";
import type { DeliveryMethod, DeliveryStatus } from "@prisma/client";

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; branchId?: string; page?: string; pageSize?: string }>;
}) {
  const { status, type, branchId, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const branchWhere = session?.user.branchId && !isOwner ? { booking: { branchId: session.user.branchId } } : branchId ? { booking: { branchId } } : {};

  const where = {
    ...branchWhere,
    ...(status ? { status: status as DeliveryStatus } : {}),
    ...(type ? { type: type as DeliveryMethod } : {}),
  };

  const [jobs, totalCount, branches] = await Promise.all([
    db.deliveryJob.findMany({
      where,
      include: { booking: { include: { customer: true } }, assignedDriver: true },
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    db.deliveryJob.count({ where }),
    isOwner ? getCachedBranches() : Promise.resolve([]),
  ]);

  const filters: FilterConfig[] = [
    { key: "status", label: "Status", options: enumOptions(DELIVERY_STATUSES) },
    { key: "type", label: "Type", options: enumOptions(DELIVERY_METHODS) },
    ...(isOwner
      ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Delivery & Pickup</h1>
          <p className="text-sm text-muted-foreground">{totalCount} jobs total</p>
        </div>
        {session?.user.role && can(session.user.role, "delivery", "create") && (
          <Button asChild>
            <Link href="/dashboard/delivery/new">
              <Plus className="size-4" /> Create Job
            </Link>
          </Button>
        )}
      </div>

      <FilterBar filters={filters} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Truck className="size-6 text-muted-foreground" />
                      No delivery jobs found.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Link href={`/dashboard/bookings/${job.bookingId}`} className="font-mono text-xs font-medium hover:underline">
                        {job.jobNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.booking.customer.firstName} {job.booking.customer.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{job.type.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-muted-foreground">{job.assignedDriver?.name ?? "Unassigned"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.scheduledDate ? format(job.scheduledDate, "d MMM") : "—"}
                      {job.windowStart && job.windowEnd ? ` · ${format(job.windowStart, "HH:mm")}–${format(job.windowEnd, "HH:mm")}` : ""}
                    </TableCell>
                    <TableCell>
                      <DeliveryStatusSelect jobId={job.id} status={job.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="jobs" />
    </div>
  );
}
