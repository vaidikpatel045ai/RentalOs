import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
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
import { enumOptions } from "@/lib/format-enum";
import type { Role } from "@prisma/client";

const STAFF_ROLES: Role[] = ["OWNER", "MANAGER", "SALES", "STYLIST", "TAILOR", "CLEANER", "DELIVERY"];

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; branchId?: string; page?: string; pageSize?: string }>;
}) {
  const { q, role, branchId, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const canCreate = Boolean(session?.user && can(session.user.role, "staff", "create"));
  const canEdit = Boolean(session?.user && can(session.user.role, "staff", "update"));
  const branchWhere = session?.user.branchId && !isOwner ? { branchId: session.user.branchId } : branchId ? { branchId } : {};

  const where = {
    role: role ? (role as Role) : { not: "CUSTOMER" as const },
    ...branchWhere,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [users, totalCount, branches] = await Promise.all([
    db.user.findMany({
      where,
      include: { branch: true, staffProfile: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      skip,
      take,
    }),
    db.user.count({ where }),
    isOwner ? getCachedBranches() : Promise.resolve([]),
  ]);

  const filters: FilterConfig[] = [
    { key: "role", label: "Role", options: enumOptions(STAFF_ROLES) },
    ...(isOwner
      ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Staff</h1>
          <p className="text-sm text-muted-foreground">{totalCount} team members</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/staff/new">
              <Plus className="size-4" /> Add Staff
            </Link>
          </Button>
        )}
      </div>

      <FilterBar searchKey="q" searchPlaceholder="Search name…" filters={filters} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Employee Code</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="py-12 text-center text-sm text-muted-foreground">
                    No staff found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.role}</TableCell>
                    <TableCell className="text-muted-foreground">{u.branch?.name ?? "All Branches"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.staffProfile?.employeeCode ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "secondary" : "outline"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon-sm">
                          <Link href={`/dashboard/staff/${u.id}/edit`}>
                            <Pencil className="size-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="staff" />
    </div>
  );
}
