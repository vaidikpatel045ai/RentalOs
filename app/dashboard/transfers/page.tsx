import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { TransferActionsControl } from "@/components/domain/transfer-actions-control";
import { parsePagination } from "@/lib/pagination";
import { enumOptions } from "@/lib/format-enum";
import { format } from "date-fns";
import type { TransferStatus } from "@prisma/client";

const TRANSFER_STATUSES: TransferStatus[] = ["REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED", "REJECTED"];

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; pageSize?: string }>;
}) {
  const { status, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);
  const session = await auth();
  const canCreate = Boolean(session?.user && can(session.user.role, "transfers", "create"));
  const canManage = Boolean(session?.user && (can(session.user.role, "transfers", "approve") || can(session.user.role, "transfers", "update")));

  const where = status ? { status: status as TransferStatus } : {};

  const [transfers, totalCount] = await Promise.all([
    db.inventoryTransfer.findMany({
      where,
      include: { garment: true, fromBranch: true, toBranch: true, requestedBy: true },
      orderBy: { requestedAt: "desc" },
      skip,
      take,
    }),
    db.inventoryTransfer.count({ where }),
  ]);

  const filters: FilterConfig[] = [{ key: "status", label: "Status", options: enumOptions(TRANSFER_STATUSES) }];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Inventory Transfers</h1>
          <p className="text-sm text-muted-foreground">{totalCount} transfers</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/transfers/new">
              <Plus className="size-4" /> Request Transfer
            </Link>
          </Button>
        )}
      </div>

      <FilterBar filters={filters} />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Garment</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No transfers yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.garment.sku}</TableCell>
                      <TableCell className="text-muted-foreground">{t.fromBranch.name}</TableCell>
                      <TableCell className="text-muted-foreground">{t.toBranch.name}</TableCell>
                      <TableCell className="text-muted-foreground">{t.requestedBy?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{format(t.requestedAt, "d MMM yyyy")}</TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <TransferActionsControl transferId={t.id} status={t.status} />
                        ) : (
                          <span className="text-xs text-muted-foreground">{t.status.replaceAll("_", " ")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="transfers" />
    </div>
  );
}
