import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliveryStatusSelect } from "@/components/domain/job-status-select";

export default async function DeliveryPortalPage() {
  const session = await auth();
  const jobs = await db.deliveryJob.findMany({
    where: { assignedDriverId: session?.user.id, status: { notIn: ["DELIVERED", "RETURNED"] } },
    include: { booking: { include: { customer: true } } },
    orderBy: { scheduledDate: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-xl">Delivery & Pickup</h1>
        <p className="text-sm text-muted-foreground">{jobs.length} active jobs</p>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing assigned right now.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle className="font-heading text-base">{job.jobNumber}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {job.booking.customer.firstName} {job.booking.customer.lastName} · {job.type.replaceAll("_", " ")}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {job.address && <p className="text-sm">{job.address}</p>}
                {job.phone && <p className="text-sm text-muted-foreground">{job.phone}</p>}
                {job.scheduledDate && (
                  <p className="text-sm text-muted-foreground">
                    {format(job.scheduledDate, "d MMM yyyy")}
                    {job.windowStart && job.windowEnd
                      ? ` · ${format(job.windowStart, "HH:mm")}–${format(job.windowEnd, "HH:mm")}`
                      : ""}
                  </p>
                )}
                <DeliveryStatusSelect jobId={job.id} status={job.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
