import { isToday, startOfDay } from "date-fns";
import { Camera } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranchById } from "@/lib/queries/branches";
import { isPhotographyEnabled } from "@/lib/photography";
import { PortalGreeting, PortalJobBoard } from "@/components/domain/portal/portal-job-board";
import { PhotographerShootCard, type PhotographerShootCardData } from "@/components/domain/photographer-shoot-card";

export default async function PhotographerPortalPage() {
  const session = await auth();
  const user = session?.user;
  const [enabled, branch] = await Promise.all([
    isPhotographyEnabled(user?.organizationId),
    user?.branchId ? getCachedBranchById(user.branchId) : Promise.resolve(null),
  ]);

  if (!user || !enabled) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <Camera className="size-8 text-muted-foreground" />
        <h1 className="font-heading text-xl">Photography isn&apos;t switched on</h1>
        <p className="text-sm text-muted-foreground">Your boutique doesn&apos;t have photography services turned on right now. Ask the owner if you think this is a mistake.</p>
      </div>
    );
  }

  const rows = await db.photoShoot.findMany({
    where: { photographerId: user.id, status: { not: "CANCELLED" } },
    include: { customer: true, service: true, branch: { select: { timezone: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 300,
  });

  const shoots: PhotographerShootCardData[] = rows.map((s) => ({
    id: s.id,
    shootNumber: s.shootNumber,
    status: s.status,
    type: s.type,
    serviceName: s.service?.name ?? null,
    deliverables: s.service?.deliverables ?? null,
    scheduledAt: s.scheduledAt,
    timezone: s.branch.timezone,
    durationMinutes: s.durationMinutes,
    location: s.location,
    notes: s.notes,
    galleryUrl: s.galleryUrl,
    photographerNotes: s.photographerNotes,
    client: { name: `${s.customer.firstName} ${s.customer.lastName}`, phone: s.customer.phone, whatsapp: s.customer.whatsapp },
  }));

  // Shoots today; shoots coming up; shot (or past) but not yet delivered; delivered.
  const todayStart = startOfDay(new Date());
  const groups = { overdue: [] as PhotographerShootCardData[], today: [] as PhotographerShootCardData[], upcoming: [] as PhotographerShootCardData[], completed: [] as PhotographerShootCardData[] };
  for (const s of shoots) {
    if (s.status === "DELIVERED") groups.completed.push(s);
    else if (s.status === "SHOT" || s.status === "EDITING" || (s.status === "BOOKED" && s.scheduledAt < todayStart)) groups.overdue.push(s);
    else if (isToday(s.scheduledAt)) groups.today.push(s);
    else groups.upcoming.push(s);
  }
  groups.completed.reverse();

  const render = (list: PhotographerShootCardData[]) => list.map((s) => <PhotographerShootCard key={s.id} shoot={s} />);
  const parts = [
    groups.today.length ? `${groups.today.length} shoot${groups.today.length === 1 ? "" : "s"} today` : null,
    groups.overdue.length ? `${groups.overdue.length} to deliver` : null,
    groups.upcoming.length ? `${groups.upcoming.length} coming up` : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalGreeting
        name={user.name ?? "there"}
        timezone={branch?.timezone ?? "Asia/Dubai"}
        title="My Shoots"
        summary={parts.length ? `${parts.join(", ")}.` : "Nothing scheduled. New shoots appear here when the boutique assigns them to you."}
      />
      <PortalJobBoard
        labels={{ overdue: "To deliver", today: "Today", upcoming: "Upcoming", completed: "Delivered" }}
        groups={{
          overdue: render(groups.overdue),
          today: render(groups.today),
          upcoming: render(groups.upcoming),
          completed: render(groups.completed),
        }}
        emptyText={{
          overdue: "No photos waiting to be delivered.",
          today: "No shoots today.",
          upcoming: "No upcoming shoots.",
          completed: "Delivered shoots will show here.",
        }}
      />
    </div>
  );
}
