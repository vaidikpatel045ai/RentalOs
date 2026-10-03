import Link from "next/link";
import { Plus, Building2, Users, Wallet, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/domain/kpi-card";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";
import { ORGANIZATION_STATUSES } from "@/lib/validations/organization";
import { enumOptions, enumLabel } from "@/lib/format-enum";
import type { OrganizationStatus } from "@prisma/client";

const STATUS_BADGE_VARIANT: Record<OrganizationStatus, "secondary" | "outline" | "destructive"> = {
  TRIAL: "outline",
  ACTIVE: "secondary",
  PAST_DUE: "outline",
  SUSPENDED: "destructive",
  CANCELLED: "destructive",
};

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const where = status ? { status: status as OrganizationStatus } : {};

  const [organizations, allOrgsForSummary] = await Promise.all([
    db.organization.findMany({
      where,
      include: { plan: true, _count: { select: { branches: true, users: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.organization.findMany({ include: { plan: true } }),
  ]);

  const activeCount = allOrgsForSummary.filter((o) => o.status === "ACTIVE").length;
  const trialCount = allOrgsForSummary.filter((o) => o.status === "TRIAL").length;
  const suspendedCount = allOrgsForSummary.filter((o) => o.status === "SUSPENDED" || o.status === "CANCELLED").length;
  const mrr = allOrgsForSummary
    .filter((o) => o.status === "ACTIVE" && o.plan?.billingInterval === "MONTHLY")
    .reduce((sum, o) => sum + Number(o.plan?.price ?? 0), 0);

  const filters: FilterConfig[] = [{ key: "status", label: "Status", options: enumOptions(ORGANIZATION_STATUSES) }];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Organizations</h1>
          <p className="text-sm text-muted-foreground">{allOrgsForSummary.length} boutiques on the platform</p>
        </div>
        <Button asChild>
          <Link href="/admin/organizations/new">
            <Plus className="size-4" /> New Organization
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Active" value={activeCount} icon={Building2} />
        <KpiCard label="Trialing" value={trialCount} icon={Users} />
        <KpiCard label="Suspended / Cancelled" value={suspendedCount} icon={ShieldAlert} tone={suspendedCount > 0 ? "warning" : "default"} />
        <KpiCard label="Est. MRR" value={formatMoney(mrr, "AED")} icon={Wallet} tone="gold" />
      </div>

      <FilterBar filters={filters} />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Boutique</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Branches</TableHead>
                  <TableHead className="text-right">Staff</TableHead>
                  <TableHead>Period End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No organizations yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <Link href={`/admin/organizations/${org.id}`} className="font-medium hover:underline">
                          {org.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {org.plan ? `${org.plan.name} (${enumLabel(org.plan.billingInterval)})` : "No plan"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE_VARIANT[org.status]}>{enumLabel(org.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{org._count.branches}</TableCell>
                      <TableCell className="text-right">{org._count.users}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {org.currentPeriodEnd ? new Date(org.currentPeriodEnd).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
