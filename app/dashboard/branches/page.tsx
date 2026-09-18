import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BranchesPage() {
  const session = await auth();
  const canManage = Boolean(session?.user && can(session.user.role, "branches", "update"));
  const canCreate = Boolean(session?.user && can(session.user.role, "branches", "create"));

  const branches = await db.branch.findMany({
    include: { _count: { select: { users: true, customers: true, garments: true, bookings: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Branches</h1>
          <p className="text-sm text-muted-foreground">
            {branches.length} active locations · new markets (e.g. USA) are added here without any code changes.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/branches/new">
              <Plus className="size-4" /> New Branch
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <Card key={b.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="font-heading text-base">{b.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {b.city ? `${b.city}, ` : ""}
                  {b.country} · {b.currency}
                </p>
              </div>
              {canManage && (
                <Button asChild variant="ghost" size="icon-sm">
                  <Link href={`/dashboard/branches/${b.id}/edit`}>
                    <Pencil className="size-3.5" />
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Staff" value={b._count.users} />
              <Stat label="Customers" value={b._count.customers} />
              <Stat label="Garments" value={b._count.garments} />
              <Stat label="Bookings" value={b._count.bookings} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg">{value}</p>
    </div>
  );
}
