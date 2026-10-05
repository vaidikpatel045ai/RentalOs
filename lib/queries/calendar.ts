import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";

/** Everything the calendar's event pop-up shows. Plain strings/numbers only
 * (money pre-formatted here) — this crosses the unstable_cache JSON boundary
 * and is passed to a client component, so no Date/Decimal values inside. */
export interface CalendarEventDetails {
  kind: "Appointment" | "Pickup" | "Return";
  subtype: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  customerHref: string;
  branchName: string;
  staffName: string | null;
  durationMinutes: number | null;
  room: string | null;
  notes: string | null;
  bookingNumber: string | null;
  bookingHref: string | null;
  garments: string[];
  rentalWindow: { start: string; end: string } | null;
  totalAmount: string | null;
  balanceDue: string | null;
  paymentStatus: string | null;
}

export interface CalendarEvent {
  id: string;
  date: Date;
  label: string;
  type: "appointment" | "pickup" | "return" | "fitting" | "trial";
  href: string;
  details: CalendarEventDetails;
}

type CalendarEventCached = Omit<CalendarEvent, "date"> & { date: string };

const bookingInclude = {
  customer: true,
  branch: true,
  assignedStaff: true,
  items: { include: { garment: { select: { sku: true, name: true } } } },
} as const;

async function computeCalendarEvents(
  rangeStartIso: string,
  rangeEndIso: string,
  branchId: string | undefined,
  organizationId: string
): Promise<CalendarEventCached[]> {
  const rangeStart = new Date(rangeStartIso);
  const rangeEnd = new Date(rangeEndIso);
  const branchWhere = branchId ? { branchId } : { branch: { organizationId } };

  const [appointments, pickups, returns] = await Promise.all([
    db.appointment.findMany({
      where: { ...branchWhere, scheduledAt: { gte: rangeStart, lte: rangeEnd }, status: { not: "CANCELLED" } },
      include: { customer: true, branch: true, assignedStaff: true, booking: { select: { id: true, bookingNumber: true } } },
    }),
    db.booking.findMany({
      where: { ...branchWhere, pickupDate: { gte: rangeStart, lte: rangeEnd }, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      include: bookingInclude,
    }),
    db.booking.findMany({
      where: { ...branchWhere, returnDate: { gte: rangeStart, lte: rangeEnd }, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      include: bookingInclude,
    }),
  ]);

  const bookingDetails = (b: (typeof pickups)[number], kind: "Pickup" | "Return"): CalendarEventDetails => ({
    kind,
    subtype: kind === "Pickup" ? b.deliveryMethod.replaceAll("_", " ") : b.returnMethod.replaceAll("_", " "),
    status: b.status.replaceAll("_", " "),
    customerName: `${b.customer.firstName} ${b.customer.lastName}`,
    customerPhone: b.customer.phone,
    customerHref: `/dashboard/customers/${b.customerId}`,
    branchName: b.branch.name,
    staffName: b.assignedStaff?.name ?? null,
    durationMinutes: null,
    room: null,
    notes: b.notes,
    bookingNumber: b.bookingNumber,
    bookingHref: `/dashboard/bookings/${b.id}`,
    garments: b.items.map((i) => `${i.garment.sku} — ${i.garment.name}`),
    rentalWindow: { start: b.rentalStart.toISOString(), end: b.rentalEnd.toISOString() },
    totalAmount: formatMoney(b.totalAmount, b.branch.currency),
    balanceDue: formatMoney(b.balanceDue, b.branch.currency),
    paymentStatus: b.paymentStatus.replaceAll("_", " "),
  });

  const events: CalendarEventCached[] = [
    ...appointments.map((a) => ({
      id: `appt-${a.id}`,
      date: a.scheduledAt.toISOString(),
      label: `${a.type.replaceAll("_", " ")} — ${a.customer.firstName} ${a.customer.lastName}`,
      type: (a.type === "FITTING" || a.type === "FINAL_FITTING" ? "fitting" : "appointment") as CalendarEvent["type"],
      href: a.booking ? `/dashboard/bookings/${a.booking.id}` : `/dashboard/customers/${a.customerId}`,
      details: {
        kind: "Appointment" as const,
        subtype: a.type.replaceAll("_", " "),
        status: a.status.replaceAll("_", " "),
        customerName: `${a.customer.firstName} ${a.customer.lastName}`,
        customerPhone: a.customer.phone,
        customerHref: `/dashboard/customers/${a.customerId}`,
        branchName: a.branch.name,
        staffName: a.assignedStaff?.name ?? null,
        durationMinutes: a.durationMinutes,
        room: a.room,
        notes: a.notes,
        bookingNumber: a.booking?.bookingNumber ?? null,
        bookingHref: a.booking ? `/dashboard/bookings/${a.booking.id}` : null,
        garments: [],
        rentalWindow: null,
        totalAmount: null,
        balanceDue: null,
        paymentStatus: null,
      },
    })),
    ...pickups.map((b) => ({
      id: `pickup-${b.id}`,
      date: (b.pickupDate as Date).toISOString(),
      label: `Pickup — ${b.customer.firstName} ${b.customer.lastName} (${b.bookingNumber})`,
      type: "pickup" as const,
      href: `/dashboard/bookings/${b.id}`,
      details: bookingDetails(b, "Pickup"),
    })),
    ...returns.map((b) => ({
      id: `return-${b.id}`,
      date: (b.returnDate as Date).toISOString(),
      label: `Return — ${b.customer.firstName} ${b.customer.lastName} (${b.bookingNumber})`,
      type: "return" as const,
      href: `/dashboard/bookings/${b.id}`,
      details: bookingDetails(b, "Return"),
    })),
  ];

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// The calendar's granularity (a day) means a short cache window is
// invisible in practice while still saving three queries per view whenever
// several staff have the same month open.
const getCachedCalendarEvents = unstable_cache(computeCalendarEvents, ["calendar-events-v2"], {
  revalidate: 60,
  tags: ["calendar"],
});

export async function getCalendarEvents(
  rangeStart: Date,
  rangeEnd: Date,
  branchId: string | undefined,
  organizationId: string
): Promise<CalendarEvent[]> {
  const rows = await getCachedCalendarEvents(rangeStart.toISOString(), rangeEnd.toISOString(), branchId, organizationId);
  return rows.map((r) => ({ ...r, date: new Date(r.date) }));
}
