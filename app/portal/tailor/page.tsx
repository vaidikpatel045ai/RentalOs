import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranchById } from "@/lib/queries/branches";
import { TailorJobCard, type TailorJobCardData } from "@/components/domain/tailor-job-card";
import { PortalGreeting, PortalJobBoard } from "@/components/domain/portal/portal-job-board";
import { groupJobsByTimeline } from "@/lib/job-grouping";

export default async function TailorPortalPage() {
  const session = await auth();
  const [rows, branch] = await Promise.all([
    db.tailoringJob.findMany({
      where: { assignedToUserId: session?.user.id },
      include: {
        garment: { include: { images: { where: { isPrimary: true }, take: 1 } } },
        customer: true,
        tailoringNotes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      },
      orderBy: { dueAt: "asc" },
      take: 200,
    }),
    session?.user.branchId ? getCachedBranchById(session.user.branchId) : Promise.resolve(null),
  ]);

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
  const render = (list: TailorJobCardData[]) => list.map((job) => <TailorJobCard key={job.id} job={job} />);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalGreeting
        name={session?.user.name ?? "there"}
        timezone={branch?.timezone ?? "Asia/Dubai"}
        title="My Alterations"
        summary={workloadSummary(activeCount, groups.overdue.length, groups.today.length, "alteration")}
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
          upcoming: "No upcoming alterations.",
          completed: "Finished jobs will show here.",
        }}
      />
    </div>
  );
}

function workloadSummary(active: number, overdue: number, today: number, noun: string): string {
  if (active === 0) return "You're all caught up.";
  const parts = [`${active} active ${noun} job${active === 1 ? "" : "s"}`];
  if (overdue > 0) parts.push(`${overdue} overdue`);
  if (today > 0) parts.push(`${today} due today`);
  return `${parts.join(", ")}.`;
}
