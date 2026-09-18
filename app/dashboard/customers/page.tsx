import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { parsePagination } from "@/lib/pagination";
import { enumOptions } from "@/lib/format-enum";
import type { Language } from "@prisma/client";

const LANGUAGES: Language[] = ["EN", "AR", "HI", "UR"];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; branchId?: string; language?: string; page?: string; pageSize?: string }>;
}) {
  const { q, branchId, language, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const branchWhere = session?.user.branchId && !isOwner ? { branchId: session.user.branchId } : branchId ? { branchId } : {};

  const where = {
    ...branchWhere,
    ...(language ? { preferredLanguage: language as Language } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, totalCount, branches] = await Promise.all([
    db.customer.findMany({
      where,
      include: { _count: { select: { bookings: true } }, branch: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.customer.count({ where }),
    isOwner ? getCachedBranches() : Promise.resolve([]),
  ]);

  const filters: FilterConfig[] = [
    ...(isOwner
      ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
      : []),
    { key: "language", label: "Language", options: enumOptions(LANGUAGES) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Customers</h1>
          <p className="text-sm text-muted-foreground">{totalCount} total</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/customers/new">
            <Plus className="size-4" /> New Customer
          </Link>
        </Button>
      </div>

      <FilterBar searchKey="q" searchPlaceholder="Search name or phone…" filters={filters} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Wedding Date</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/dashboard/customers/${c.id}`} className="font-medium hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.weddingDate ? new Date(c.weddingDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.branch.name}</TableCell>
                    <TableCell className="text-right">{c._count.bookings}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="customers" />
    </div>
  );
}
