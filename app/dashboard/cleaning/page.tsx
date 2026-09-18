import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
import { Plus, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { parsePagination } from "@/lib/pagination";
import { CleaningStatusSelect } from "@/components/domain/job-status-select";
import { enumOptions } from "@/lib/format-enum";
import { CLEANING_STATUSES, CLEANING_TYPES, TAILORING_PRIORITIES } from "@/lib/validations/job";
import type { CleaningStatus, CleaningType, Priority } from "@prisma/client";

export default async function CleaningPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; priority?: string; branchId?: string; page?: string; pageSize?: string }>;
}) {
  const { status, type, priority, branchId, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const branchWhere = session?.user.branchId && !isOwner ? { garment: { branchId: session.user.branchId } } : branchId ? { garment: { branchId } } : {};

  const where = {
    ...branchWhere,
    ...(status ? { status: status as CleaningStatus } : {}),
    ...(type ? { cleaningType: type as CleaningType } : {}),
    ...(priority ? { priority: priority as Priority } : {}),
  };

  const [jobs, totalCount, branches] = await Promise.all([
    db.garmentCleaningJob.findMany({
      where,
      include: { garment: true, assignedTo: true },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    db.garmentCleaningJob.count({ where }),
    isOwner ? getCachedBranches() : Promise.resolve([]),
  ]);

  const filters: FilterConfig[] = [
    { key: "status", label: "Status", options: enumOptions(CLEANING_STATUSES) },
    { key: "type", label: "Type", options: enumOptions(CLEANING_TYPES) },
    { key: "priority", label: "Priority", options: enumOptions(TAILORING_PRIORITIES) },
    ...(isOwner
      ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Cleaning</h1>
          <p className="text-sm text-muted-foreground">{totalCount} jobs total</p>
        </div>
        {session?.user.role && can(session.user.role, "cleaning", "create") && (
          <Button asChild>
            <Link href="/dashboard/cleaning/new">
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
                <TableHead>Garment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Cleaner</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Sparkles className="size-6 text-muted-foreground" />
                      No cleaning jobs found.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => {
                  const overdue = job.dueAt && isPast(job.dueAt) && !isToday(job.dueAt) && job.status !== "COMPLETED";
                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Link href={`/dashboard/garments/${job.garmentId}`} className="font-medium hover:underline">
                          {job.garment.sku}
                        </Link>
                        <p className="text-xs text-muted-foreground">{job.garment.name}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{job.cleaningType.replaceAll("_", " ")}</TableCell>
                      <TableCell className="text-muted-foreground">{job.assignedTo?.name ?? "Unassigned"}</TableCell>
                      <TableCell>
                        <Badge variant={job.priority === "HIGH" || job.priority === "URGENT" ? "destructive" : "secondary"}>
                          {job.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className={overdue ? "font-medium text-risk-unsafe" : "text-muted-foreground"}>
                        {job.dueAt ? format(job.dueAt, "d MMM") : "—"}
                      </TableCell>
                      <TableCell>
                        <CleaningStatusSelect jobId={job.id} status={job.status} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="jobs" />
    </div>
  );
}
