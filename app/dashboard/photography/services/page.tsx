import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/currency";
import { enumLabel } from "@/lib/format-enum";
import { branchScope } from "@/lib/scope";
import { requirePhotographyPage } from "@/lib/photography-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PhotoServiceActiveToggle } from "@/components/domain/photo-service-active-toggle";

export default async function PhotoServicesPage() {
  const user = await requirePhotographyPage("view");
  const canCreate = can(user.role, "photography", "create");
  const canUpdate = can(user.role, "photography", "update");

  const services = await db.photoService.findMany({
    where: await branchScope(user),
    include: { branch: true, _count: { select: { shoots: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/photography" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" /> Photography
          </Link>
          <h1 className="font-heading text-2xl">Services</h1>
          <p className="text-sm text-muted-foreground">
            The shoots you offer. Active services can be booked, and clients can request them from their portal.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/photography/services/new">
              <Plus className="size-4" /> Add service
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Shoots</TableHead>
                  <TableHead>Offered</TableHead>
                  {canUpdate && <TableHead className="text-right">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canUpdate ? 7 : 6} className="py-12 text-center text-sm text-muted-foreground">
                      No services yet. Add your first, for example a 3-hour pre-wedding shoot.
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map((s) => {
                    const sub = [s.deliverables, user.role === "OWNER" ? s.branch.name : null].filter(Boolean).join(" · ");
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="font-medium">{s.name}</p>
                          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{enumLabel(s.type)}</TableCell>
                        <TableCell className="text-muted-foreground">{s.durationMinutes} min</TableCell>
                        <TableCell className="tabular-nums">{formatMoney(s.price, s.branch.currency)}</TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">{s._count.shoots}</TableCell>
                        <TableCell>
                          {canUpdate ? (
                            <PhotoServiceActiveToggle serviceId={s.id} isActive={s.isActive} name={s.name} />
                          ) : (
                            <span className="text-xs text-muted-foreground">{s.isActive ? "Yes" : "No"}</span>
                          )}
                        </TableCell>
                        {canUpdate && (
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${s.name}`}>
                              <Link href={`/dashboard/photography/services/${s.id}/edit`}>
                                <Pencil className="size-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
