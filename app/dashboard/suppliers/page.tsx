import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { SupplierDeleteControl } from "@/components/domain/supplier-delete-control";
import { parsePagination } from "@/lib/pagination";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const { q, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const session = await auth();
  const canCreate = Boolean(session?.user && can(session.user.role, "suppliers", "create"));
  const canDelete = Boolean(session?.user && can(session.user.role, "suppliers", "delete"));

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { contactName: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [suppliers, totalCount] = await Promise.all([
    db.supplier.findMany({ where, orderBy: { name: "asc" }, skip, take }),
    db.supplier.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Suppliers</h1>
          <p className="text-sm text-muted-foreground">{totalCount} suppliers</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/suppliers/new">
              <Plus className="size-4" /> Add Supplier
            </Link>
          </Button>
        )}
      </div>

      <FilterBar searchKey="q" searchPlaceholder="Search name or contact…" />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  {canCreate && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canCreate ? 5 : 4} className="py-12 text-center text-sm text-muted-foreground">
                      No suppliers yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.contactName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                      {canCreate && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="icon-sm">
                              <Link href={`/dashboard/suppliers/${s.id}/edit`}>
                                <Pencil className="size-3.5" />
                              </Link>
                            </Button>
                            {canDelete && <SupplierDeleteControl supplierId={s.id} name={s.name} />}
                          </div>
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

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="suppliers" />
    </div>
  );
}
