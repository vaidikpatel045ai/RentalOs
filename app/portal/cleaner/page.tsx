import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranchById } from "@/lib/queries/branches";
import { CleanerJobCard, type CleanerJobCardData } from "@/components/domain/cleaner-job-card";
import { PortalGreeting, PortalJobBoard } from "@/components/domain/portal/portal-job-board";
import { groupJobsByTimeline } from "@/lib/job-grouping";

export default async function CleanerPortalPage() {
  const session = await auth();
  const [rows, branch] = await Promise.all([
    db.garmentCleaningJob.findMany({
      where: { assignedToUserId: session?.user.id },
      include: {
        garment: { include: { images: { where: { isPrimary: true }, take: 1 } } },
        booking: { include: { customer: true } },
      },
      orderBy: { dueAt: "asc" },
      take: 200,
    }),
    session?.user.branchId ? getCachedBranchById(session.user.branchId) : Promise.resolve(null),
  ]);

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
  const render = (list: CleanerJobCardData[]) => list.map((job) => <CleanerJobCard key={job.id} job={job} />);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalGreeting
        name={session?.user.name ?? "there"}
        timezone={branch?.timezone ?? "Asia/Dubai"}
        title="Cleaning Queue"
        summary={workloadSummary(activeCount, groups.overdue.length, groups.today.length)}
      />
      <PortalJobBoard
        groups={{
          overdue: render(groups.overdue),
          today: render(groups.today),
          upcoming: render(groups.upcoming),
          completed: render(groups.completed),
        }}
        emptyText={{
          overdue: "Nothing overdue. Nice work.",
          today: "Nothing due today.",
          upcoming: "The queue is clear.",
          completed: "Finished jobs will show here.",
        }}
      />
    </div>
  );
}

function workloadSummary(active: number, overdue: number, today: number): string {
  if (active === 0) return "You're all caught up.";
  const parts = [`${active} garment${active === 1 ? "" : "s"} to clean`];
  if (overdue > 0) parts.push(`${overdue} overdue`);
  if (today > 0) parts.push(`${today} due today`);
  return `${parts.join(", ")}.`;
}
