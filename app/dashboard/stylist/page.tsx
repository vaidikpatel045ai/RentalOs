import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StylistDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const branchWhere = session.user.branchId ? { branchId: session.user.branchId } : {};

  const upcomingFittings = await db.appointment.findMany({
    where: {
      ...branchWhere,
      type: { in: ["FITTING", "ALTERATION_FITTING", "FINAL_FITTING", "DRESS_SELECTION", "NEW_CONSULTATION"] },
      scheduledAt: { gte: new Date() },
      status: { not: "CANCELLED" },
    },
    include: { customer: true },
    orderBy: { scheduledAt: "asc" },
    take: 12,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl">Styling Schedule</h1>
        <p className="text-sm text-muted-foreground">Upcoming consultations, selections and fittings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingFittings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          ) : (
            upcomingFittings.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">
                    {a.customer.firstName} {a.customer.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.type.replaceAll("_", " ")}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(a.scheduledAt, "d MMM, HH:mm")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
