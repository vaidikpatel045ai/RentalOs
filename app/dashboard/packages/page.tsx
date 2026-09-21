import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { PackageActiveToggle } from "@/components/domain/package-active-toggle";
import { parsePagination } from "@/lib/pagination";

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; branchId?: string; page?: string; pageSize?: string }>;
}) {
  const { q, branchId, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const canManage = Boolean(session?.user && can(session.user.role, "packages", "update"));
  const canCreate = Boolean(session?.user && can(session.user.role, "packages", "create"));

  const branchWhere = session?.user.branchId && !isOwner ? { branchId: session.user.branchId } : branchId ? { branchId } : {};
  const where = {
    ...branchWhere,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [packages, totalCount, branches] = await Promise.all([
    db.package.findMany({
      where,
      include: { branch: true, items: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.package.count({ where }),
    isOwner ? getCachedBranches() : Promise.resolve([]),
  ]);

  const filters: FilterConfig[] = isOwner
    ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Packages</h1>
          <p className="text-sm text-muted-foreground">{totalCount} packages</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/packages/new">
              <Plus className="size-4" /> New Package
            </Link>
          </Button>
        )}
      </div>

      <FilterBar searchKey="q" searchPlaceholder="Search packages…" filters={filters} />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Active</TableHead>
                  {canCreate && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canCreate ? 6 : 5} className="py-12 text-center text-sm text-muted-foreground">
                      No packages yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  packages.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.branch.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.items.length}</TableCell>
                      <TableCell>{formatMoney(p.price, p.branch.currency)}</TableCell>
                      <TableCell>
                        {canManage ? (
                          <PackageActiveToggle packageId={p.id} isActive={p.isActive} />
                        ) : (
                          <span className="text-xs text-muted-foreground">{p.isActive ? "Active" : "Inactive"}</span>
                        )}
                      </TableCell>
                      {canCreate && (
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link href={`/dashboard/packages/${p.id}/edit`}>
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
          </div>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="packages" />
    </div>
  );
}
