import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TailorJobCard, type TailorJobCardData } from "@/components/domain/tailor-job-card";
import { groupJobsByTimeline } from "@/lib/job-grouping";
import { CheckCircle2 } from "lucide-react";

export default async function TailorPortalPage() {
  const session = await auth();
  const rows = await db.tailoringJob.findMany({
    where: { assignedToUserId: session?.user.id },
    include: {
      garment: { include: { images: { where: { isPrimary: true }, take: 1 } } },
      customer: true,
      tailoringNotes: { orderBy: { createdAt: "desc" }, include: { author: true } },
    },
    orderBy: { dueAt: "asc" },
    take: 200,
  });

  const jobs: TailorJobCardData[] = rows.map((job) => ({
    id: job.id,
    status: job.status,
    priority: job.priority,
    dueAt: job.dueAt,
    instructions: job.instructions,
    beforeMeasurements: job.beforeMeasurements,
    notes: job.notes,
    garment: {
      id: job.garment.id,
      sku: job.garment.sku,
      name: job.garment.name,
      imageUrl: job.garment.images[0]?.url ?? null,
    },
    customer: job.customer ? { id: job.customer.id, firstName: job.customer.firstName, lastName: job.customer.lastName } : null,
    tailoringNotes: job.tailoringNotes.map((n) => ({
      id: n.id,
      note: n.note,
      photos: n.photos,
      createdAt: n.createdAt,
      authorName: n.author?.name ?? null,
    })),
  }));

  const groups = groupJobsByTimeline(jobs, "COMPLETED");
  const activeCount = groups.overdue.length + groups.today.length + groups.upcoming.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-xl">My Tasks</h1>
        <p className="text-sm text-muted-foreground">{activeCount} active alteration jobs</p>
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
                {key === "completed" ? "No completed jobs yet." : "Nothing here."}
              </div>
            ) : (
              groups[key].map((job) => <TailorJobCard key={job.id} job={job} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
