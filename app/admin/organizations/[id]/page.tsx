import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { OrganizationBillingPanel } from "@/components/domain/organization-billing-panel";
import { enumLabel } from "@/lib/format-enum";

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [organization, plans] = await Promise.all([
    db.organization.findUnique({
      where: { id },
      include: {
        plan: true,
        branches: { include: { _count: { select: { garments: true, bookings: true } } } },
        users: { where: { role: { not: "CUSTOMER" } }, orderBy: [{ role: "asc" }, { name: "asc" }] },
      },
    }),
    db.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
  ]);
  if (!organization) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">{organization.name}</h1>
        <p className="text-sm text-muted-foreground">
          Created {new Date(organization.createdAt).toLocaleDateString()} · {enumLabel(organization.status)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationBillingPanel organization={organization} plans={plans} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Branches ({organization.branches.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {organization.branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No branches yet.</p>
              ) : (
                organization.branches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.code} · {b.currency}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {b._count.garments} garments · {b._count.bookings} bookings
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Staff ({organization.users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organization.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No staff yet.
                  </TableCell>
                </TableRow>
              ) : (
                organization.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{enumLabel(u.role)}</TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "secondary" : "outline"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
