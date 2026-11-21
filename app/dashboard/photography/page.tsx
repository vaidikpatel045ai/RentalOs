import Link from "next/link";
import { addDays, startOfDay } from "date-fns";
import { Plus, Camera } from "lucide-react";
import type { PhotoShootStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/currency";
import { enumLabel, enumOptions } from "@/lib/format-enum";
import { parsePagination } from "@/lib/pagination";
import { getCachedBranches } from "@/lib/queries/branches";
import { branchScope } from "@/lib/scope";
import { shootBalance } from "@/lib/photography";
import { requirePhotographyPage } from "@/lib/photography-page";
import { PHOTO_SHOOT_STATUSES } from "@/lib/validations/photography";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { PhotoShootStatusBadge } from "@/components/domain/status-badge";
import { zonedDateTime } from "@/lib/datetime";

const OPEN: PhotoShootStatus[] = ["REQUESTED", "BOOKED", "SHOT", "EDITING"];

export default async function PhotographyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; photographerId?: string; branchId?: string; page?: string; pageSize?: string }>;
}) {
  const user = await requirePhotographyPage("view");
  const { q, status, photographerId, branchId, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const isOwner = user.role === "OWNER";
  const canCreate = can(user.role, "photography", "create");

  const scope = await branchScope(user);
  const branches = isOwner ? await getCachedBranches(user.organizationId ?? "") : [];
  const branchFilter = isOwner && branchId && branches.some((b) => b.id === branchId) ? { branchId } : scope;
  const statusFilter = (PHOTO_SHOOT_STATUSES as readonly string[]).includes(status ?? "") ? (status as PhotoShootStatus) : undefined;

  const where: Prisma.PhotoShootWhereInput = {
    ...branchFilter,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(photographerId ? { photographerId } : {}),
    ...(q
      ? {
          OR: [
            { shootNumber: { contains: q, mode: "insensitive" } },
            { customer: { firstName: { contains: q, mode: "insensitive" } } },
            { customer: { lastName: { contains: q, mode: "insensitive" } } },
            { customer: { phone: { contains: q } } },
          ],
        }
      : {}),
  };

  const today = startOfDay(new Date());
  const [shoots, totalCount, requested, thisWeek, toDeliver, unpaid, photographers] = await Promise.all([
    db.photoShoot.findMany({
      where,
      include: { customer: true, photographer: true, branch: true, service: true },
      // Open shoots first by date; finished ones after.
      orderBy: [{ scheduledAt: statusFilter === "DELIVERED" || statusFilter === "CANCELLED" ? "desc" : "asc" }],
      skip,
      take,
    }),
    db.photoShoot.count({ where }),
    db.photoShoot.count({ where: { ...scope, status: "REQUESTED" } }),
    db.photoShoot.count({ where: { ...scope, status: "BOOKED", scheduledAt: { gte: today, lt: addDays(today, 7) } } }),
    db.photoShoot.count({ where: { ...scope, status: { in: ["SHOT", "EDITING"] } } }),
    db.photoShoot.findMany({
      where: { ...scope, status: { not: "CANCELLED" } },
      select: { price: true, discount: true, paidAmount: true, branch: { select: { currency: true } } },
    }),
    db.user.findMany({
      where: { organizationId: user.organizationId ?? "", role: "PHOTOGRAPHER" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const owed = unpaid.reduce((sum, s) => sum + shootBalance(s), 0);
  const owedCurrency = unpaid[0]?.branch.currency ?? "AED";

  const filters: FilterConfig[] = [
    { key: "status", label: "Status", options: enumOptions(PHOTO_SHOOT_STATUSES) },
    ...(photographers.length > 0
      ? [{ key: "photographerId", label: "Photographer", options: photographers.map((p) => ({ value: p.id, label: p.name })) }]
      : []),
    ...(isOwner ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }] : []),
  ];

  const tiles = [
    { label: "Requests waiting", value: String(requested), href: "?status=REQUESTED", tone: requested > 0 ? "text-risk-tight" : "" },
    { label: "Shoots in the next 7 days", value: String(thisWeek), href: "?status=BOOKED", tone: "" },
    { label: "Photos to deliver", value: String(toDeliver), href: "?status=EDITING", tone: "" },
    { label: "Still to collect", value: formatMoney(owed, owedCurrency), href: undefined, tone: owed > 0 ? "text-risk-tight" : "" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div data-tour="page-header">
          <h1 className="font-heading text-2xl">Photography</h1>
          <p className="text-sm text-muted-foreground">Pre-wedding, bridal and other shoots</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/photography/services">
              <Camera className="size-4" /> Services
            </Link>
          </Button>
          {canCreate && (
            <Button asChild data-tour="page-action">
              <Link href="/dashboard/photography/new">
                <Plus className="size-4" /> Book a shoot
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className={`font-heading text-2xl tabular-nums ${t.tone}`}>{t.value}</p>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={`/dashboard/photography${t.href}`} className="rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/40">
              {body}
            </Link>
          ) : (
            <div key={t.label} className="rounded-xl border border-border bg-card px-4 py-3">
              {body}
            </div>
          );
        })}
      </div>

      <div data-tour="page-filters">
        <FilterBar searchKey="q" searchPlaceholder="Search client, phone or shoot number…" filters={filters} />
      </div>

      <Card data-tour="page-content">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shoot</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Photographer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shoots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      {q || statusFilter || photographerId ? "No shoots match these filters." : "No shoots yet. Book the first one, or add your services so clients can request them."}
                    </TableCell>
                  </TableRow>
                ) : (
                  shoots.map((s) => {
                    const balance = shootBalance(s);
                    const late = OPEN.includes(s.status) && s.status !== "SHOT" && s.status !== "EDITING" && s.scheduledAt < today;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <Link href={`/dashboard/photography/${s.id}`} className="hover:underline">
                            {s.shootNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/dashboard/customers/${s.customerId}`} className="hover:underline">
                            {s.customer.firstName} {s.customer.lastName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{s.service?.name ?? enumLabel(s.type)}</TableCell>
                        <TableCell className={late ? "text-risk-unsafe" : "text-muted-foreground"}>
                          {zonedDateTime(s.scheduledAt, s.branch.timezone)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{s.photographer?.name ?? <span className="italic">Not assigned</span>}</TableCell>
                        <TableCell>
                          <PhotoShootStatusBadge status={s.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.status === "CANCELLED" ? "—" : balance > 0 ? formatMoney(balance, s.branch.currency) : <span className="text-risk-safe">Paid</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="shoots" />
    </div>
  );
}
