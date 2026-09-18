import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export interface CalendarEvent {
  id: string;
  date: Date;
  label: string;
  type: "appointment" | "pickup" | "return" | "fitting" | "trial";
  href: string;
}

type CalendarEventCached = Omit<CalendarEvent, "date"> & { date: string };

async function computeCalendarEvents(rangeStartIso: string, rangeEndIso: string, branchId?: string): Promise<CalendarEventCached[]> {
  const rangeStart = new Date(rangeStartIso);
  const rangeEnd = new Date(rangeEndIso);
  const branchWhere = branchId ? { branchId } : {};

  const [appointments, pickups, returns] = await Promise.all([
    db.appointment.findMany({
      where: { ...branchWhere, scheduledAt: { gte: rangeStart, lte: rangeEnd }, status: { not: "CANCELLED" } },
      include: { customer: true },
    }),
    db.booking.findMany({
      where: { ...branchWhere, pickupDate: { gte: rangeStart, lte: rangeEnd }, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      include: { customer: true },
    }),
    db.booking.findMany({
      where: { ...branchWhere, returnDate: { gte: rangeStart, lte: rangeEnd }, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      include: { customer: true },
    }),
  ]);

  const events: CalendarEventCached[] = [
    ...appointments.map((a) => ({
      id: `appt-${a.id}`,
      date: a.scheduledAt.toISOString(),
      label: `${a.type.replaceAll("_", " ")} — ${a.customer.firstName} ${a.customer.lastName}`,
      type: (a.type === "FITTING" || a.type === "FINAL_FITTING" ? "fitting" : "appointment") as CalendarEvent["type"],
      href: `/dashboard/appointments`,
    })),
    ...pickups.map((b) => ({
      id: `pickup-${b.id}`,
      date: (b.pickupDate as Date).toISOString(),
      label: `Pickup — ${b.customer.firstName} ${b.customer.lastName} (${b.bookingNumber})`,
      type: "pickup" as const,
      href: `/dashboard/bookings/${b.id}`,
    })),
    ...returns.map((b) => ({
      id: `return-${b.id}`,
      date: (b.returnDate as Date).toISOString(),
      label: `Return — ${b.customer.firstName} ${b.customer.lastName} (${b.bookingNumber})`,
      type: "return" as const,
      href: `/dashboard/bookings/${b.id}`,
    })),
  ];

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// The calendar's granularity (a day) means a short cache window is
// invisible in practice while still saving three queries per view whenever
// several staff have the same month open.
const getCachedCalendarEvents = unstable_cache(computeCalendarEvents, ["calendar-events"], {
  revalidate: 60,
  tags: ["calendar"],
});

export async function getCalendarEvents(rangeStart: Date, rangeEnd: Date, branchId?: string): Promise<CalendarEvent[]> {
  const rows = await getCachedCalendarEvents(rangeStart.toISOString(), rangeEnd.toISOString(), branchId);
  return rows.map((r) => ({ ...r, date: new Date(r.date) }));
}
