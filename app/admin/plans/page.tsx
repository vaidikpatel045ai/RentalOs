import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlanActiveToggle } from "@/components/domain/plan-active-toggle";
import { enumLabel } from "@/lib/format-enum";

export default async function AdminPlansPage() {
  const plans = await db.plan.findMany({
    include: { _count: { select: { organizations: true } } },
    orderBy: { price: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Plans</h1>
          <p className="text-sm text-muted-foreground">{plans.length} pricing plans</p>
        </div>
        <Button asChild>
          <Link href="/admin/plans/new">
            <Plus className="size-4" /> New Plan
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Max Branches</TableHead>
                  <TableHead className="text-right">Boutiques</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No plans yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{enumLabel(p.billingInterval)}</TableCell>
                      <TableCell>{formatMoney(p.price, p.currency)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.maxBranches ?? "Unlimited"}</TableCell>
                      <TableCell className="text-right">{p._count.organizations}</TableCell>
                      <TableCell>
                        <PlanActiveToggle planId={p.id} isActive={p.isActive} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon-sm">
                          <Link href={`/admin/plans/${p.id}/edit`}>
                            <Pencil className="size-3.5" />
                          </Link>
                        </Button>
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
