import Link from "next/link";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { parsePagination } from "@/lib/pagination";
import { enumOptions } from "@/lib/format-enum";
import { APPOINTMENT_TYPES, APPOINTMENT_STATUSES } from "@/lib/validations/appointment";
import type { AppointmentStatus, AppointmentType } from "@prisma/client";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; branchId?: string; page?: string; pageSize?: string }>;
}) {
  const { q, type, status, branchId, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const branchWhere = session?.user.branchId && !isOwner ? { branchId: session.user.branchId } : branchId ? { branchId } : {};

  const where = {
    ...branchWhere,
    ...(type ? { type: type as AppointmentType } : {}),
    ...(status ? { status: status as AppointmentStatus } : {}),
    ...(q
      ? {
          OR: [
            { customer: { firstName: { contains: q, mode: "insensitive" as const } } },
            { customer: { lastName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [appointments, totalCount, branches] = await Promise.all([
    db.appointment.findMany({
      where,
      include: { customer: true, assignedStaff: true },
      orderBy: { scheduledAt: "desc" },
      skip,
      take,
    }),
    db.appointment.count({ where }),
    isOwner ? getCachedBranches() : Promise.resolve([]),
  ]);

  const filters: FilterConfig[] = [
    { key: "type", label: "Type", options: enumOptions(APPOINTMENT_TYPES) },
    { key: "status", label: "Status", options: enumOptions(APPOINTMENT_STATUSES) },
    ...(isOwner
      ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Appointments</h1>
          <p className="text-sm text-muted-foreground">{totalCount} total</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/appointments/new">
            <Plus className="size-4" /> New Appointment
          </Link>
        </Button>
      </div>

      <FilterBar searchKey="q" searchPlaceholder="Search customer…" filters={filters} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/dashboard/customers/${a.customerId}`} className="font-medium hover:underline">
                        {a.customer.firstName} {a.customer.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.type.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-muted-foreground">{format(a.scheduledAt, "d MMM yyyy, HH:mm")}</TableCell>
                    <TableCell className="text-muted-foreground">{a.assignedStaff?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{a.status.replaceAll("_", " ")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="appointments" />
    </div>
  );
}
