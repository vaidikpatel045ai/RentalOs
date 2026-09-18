import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import { getCalendarEvents } from "@/lib/queries/calendar";
import { CalendarMonth } from "@/components/domain/calendar-month";
import { Button } from "@/components/ui/button";
import { FilterBar, type FilterConfig } from "@/components/domain/filter-bar";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; branchId?: string }>;
}) {
  const { month: monthParam, branchId: branchIdParam } = await searchParams;
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";
  const month = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const rangeStart = startOfMonth(month);
  const rangeEnd = endOfMonth(month);

  const branchId = isOwner ? branchIdParam : (session?.user.branchId ?? undefined);
  const [events, branches] = await Promise.all([
    getCalendarEvents(rangeStart, rangeEnd, branchId),
    isOwner ? getCachedBranches() : Promise.resolve([]),
  ]);

  const filters: FilterConfig[] = isOwner
    ? [{ key: "branchId", label: "Branch", options: branches.map((b) => ({ value: b.id, label: b.name })) }]
    : [];

  const branchQuery = branchIdParam ? `&branchId=${branchIdParam}` : "";
  const prevHref = `/dashboard/calendar?month=${format(subMonths(month, 1), "yyyy-MM")}${branchQuery}`;
  const nextHref = `/dashboard/calendar?month=${format(addMonths(month, 1), "yyyy-MM")}${branchQuery}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Calendar</h1>
          <p className="text-sm text-muted-foreground">Appointments, pickups and returns.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon">
            <Link href={prevHref}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="w-32 text-center font-heading">{format(month, "MMMM yyyy")}</span>
          <Button asChild variant="outline" size="icon">
            <Link href={nextHref}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {isOwner && <FilterBar filters={filters} />}

      <CalendarMonth month={month} events={events} />

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend color="bg-blue-500" label="Appointment" />
        <Legend color="bg-gold" label="Fitting" />
        <Legend color="bg-risk-safe" label="Pickup" />
        <Legend color="bg-risk-tight" label="Return" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
