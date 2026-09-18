import { format } from "date-fns";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { PaginationBar } from "@/components/domain/pagination-bar";
import { parsePagination } from "@/lib/pagination";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string; page?: string; pageSize?: string }>;
}) {
  const { action, entityType, ...paginationParams } = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(paginationParams);

  const where = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
  };

  const [logs, totalCount, actionRows, entityTypeRows] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
  ]);

  const filters: FilterConfig[] = [
    { key: "action", label: "Action", options: actionRows.map((r) => ({ value: r.action, label: r.action })) },
    { key: "entityType", label: "Entity", options: entityTypeRows.map((r) => ({ value: r.entityType, label: r.entityType })) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Audit Log</h1>
        <p className="text-sm text-muted-foreground">{totalCount} events, newest first.</p>
      </div>

      <FilterBar filters={filters} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    No audit events found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">{format(log.createdAt, "d MMM, HH:mm")}</TableCell>
                    <TableCell>
                      {log.user?.name ?? "System"} <span className="text-xs text-muted-foreground">({log.userRole})</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.action}</TableCell>
                    <TableCell className="text-muted-foreground">{log.entityType}</TableCell>
                    <TableCell className="text-muted-foreground">{log.notes ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemLabel="events" />
    </div>
  );
}
