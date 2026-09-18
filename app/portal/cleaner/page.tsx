import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CleanerJobCard, type CleanerJobCardData } from "@/components/domain/cleaner-job-card";
import { groupJobsByTimeline } from "@/lib/job-grouping";
import { CheckCircle2 } from "lucide-react";

export default async function CleanerPortalPage() {
  const session = await auth();
  const rows = await db.garmentCleaningJob.findMany({
    where: { assignedToUserId: session?.user.id },
    include: {
      garment: { include: { images: { where: { isPrimary: true }, take: 1 } } },
      booking: { include: { customer: true } },
    },
    orderBy: { dueAt: "asc" },
    take: 200,
  });

  const jobs: CleanerJobCardData[] = rows.map((job) => ({
    id: job.id,
    status: job.status,
    cleaningType: job.cleaningType,
    priority: job.priority,
    dueAt: job.dueAt,
    stainNotes: job.stainNotes,
    instructions: job.instructions,
    notes: job.notes,
    cost: Number(job.cost),
    beforePhotos: job.beforePhotos,
    afterPhotos: job.afterPhotos,
    garment: {
      id: job.garment.id,
      sku: job.garment.sku,
      name: job.garment.name,
      imageUrl: job.garment.images[0]?.url ?? null,
    },
    customerName: job.booking ? `${job.booking.customer.firstName} ${job.booking.customer.lastName}` : null,
  }));

  const groups = groupJobsByTimeline(jobs, "COMPLETED");
  const activeCount = groups.overdue.length + groups.today.length + groups.upcoming.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-xl">Cleaning Queue</h1>
        <p className="text-sm text-muted-foreground">{activeCount} active jobs</p>
      </div>

      <Tabs defaultValue={groups.overdue.length > 0 ? "overdue" : groups.today.length > 0 ? "today" : "upcoming"}>
        <TabsList>
          <TabsTrigger value="overdue">Overdue{groups.overdue.length > 0 ? ` (${groups.overdue.length})` : ""}</TabsTrigger>
          <TabsTrigger value="today">Today{groups.today.length > 0 ? ` (${groups.today.length})` : ""}</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming{groups.upcoming.length > 0 ? ` (${groups.upcoming.length})` : ""}</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        {(["overdue", "today", "upcoming", "completed"] as const).map((key) => (
          <TabsContent key={key} value={key} className="space-y-3">
            {groups[key].length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="size-6" />
                {key === "completed" ? "No completed jobs yet." : "Queue is clear."}
              </div>
            ) : (
              groups[key].map((job) => <CleanerJobCard key={job.id} job={job} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
