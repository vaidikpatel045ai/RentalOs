import Link from "next/link";
import Image from "next/image";
import { Plus, Shirt } from "lucide-react";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { GarmentStatusBadge } from "@/components/domain/status-badge";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { parsePagination } from "@/lib/pagination";
import { formatMoney } from "@/lib/currency";
import { enumOptions } from "@/lib/format-enum";
import type { GarmentCategory, GarmentStatus } from "@prisma/client";
import { GARMENT_CATEGORIES, GARMENT_STATUSES } from "@/lib/validations/garment";

export default async function GarmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; branchId?: string; page?: string; pageSize?: string }>;
}) {
  const { q, category, status, branchId, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const branchWhere = session?.user.branchId && !isOwner ? { branchId: session.user.branchId } : branchId ? { branchId } : {};

  // Deleted (archived) garments are hidden everywhere by default — the
  // whole point of "delete" — but stay reachable via Status: Archived so
  // nothing is ever truly lost.
  const showingArchived = status === "ARCHIVED";
  const where = {
    ...branchWhere,
    isActive: !showingArchived,
    ...(category ? { category: category as GarmentCategory } : {}),
    ...(status ? { currentStatus: status as GarmentStatus } : {}),
    ...(q
      ? {
          OR: [
            { sku: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [garments, totalCount, branches] = await Promise.all([
    db.garment.findMany({
      where,
      include: { images: { where: { isPrimary: true }, take: 1 }, branch: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.garment.count({ where }),
    isOwner ? getCachedBranches() : Promise.resolve([]),
  ]);

  const filters: FilterConfig[] = [
    { key: "category", label: "Category", options: enumOptions(GARMENT_CATEGORIES) },
    { key: "status", label: "Status", options: enumOptions(GARMENT_STATUSES) },
    ...(isOwner
      ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} {showingArchived ? "deleted garments" : "garments"} total
            {!showingArchived && ' · deleted items are hidden — filter Status: "Archived" to see them'}
          </p>
        </div>
        {session?.user.role && can(session.user.role, "garments", "create") && (
          <Button asChild>
            <Link href="/dashboard/garments/new">
              <Plus className="size-4" /> Add Garment
            </Link>
          </Button>
        )}
      </div>

      <FilterBar searchKey="q" searchPlaceholder="Search SKU or name…" filters={filters} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {garments.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No garments found.</p>
        ) : (
          garments.map((g) => (
            <Link
              key={g.id}
              href={`/dashboard/garments/${g.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[3/4] w-full bg-muted">
                {g.images[0] ? (
                  <Image src={g.images[0].url} alt={g.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Shirt className="size-10" />
                  </div>
                )}
                <div className="absolute left-2 top-2">
                  <GarmentStatusBadge status={g.currentStatus} />
                </div>
              </div>
              <div className="p-3">
                <p className="font-mono text-xs text-muted-foreground">{g.sku}</p>
                <p className="truncate font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground">{g.category.replaceAll("_", " ")}</p>
                <p className="mt-1 font-heading text-sm">{formatMoney(g.rentalPrice, g.branch.currency)} / rental</p>
              </div>
            </Link>
          ))
        )}
      </div>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="garments" />
    </div>
  );
}
