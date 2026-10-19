import { addHours, differenceInCalendarDays, endOfDay, format, startOfDay } from "date-fns";
import type { BookingStatus, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { enumLabel } from "@/lib/format-enum";
import { isOrganizationActive } from "@/lib/tenant";
import { escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { trustedAppUrl } from "@/lib/app-url";

/**
 * The daily reminder run (triggered by Vercel Cron, see vercel.json and
 * app/api/cron/reminders). It looks for things that need a person today and
 * leaves each responsible staff member an in-app notification, plus one
 * summary email per person when email is set up.
 *
 * "Today" is the server's day, the same window the dashboards count with.
 * Running it twice in a day is safe: a reminder already sent to the same
 * person about the same record within the last 20 hours is skipped.
 *
 * The summary emails are opt-in (REMINDER_EMAILS=on) on top of Resend being
 * configured: the demo boutique's staff addresses are on a domain that
 * doesn't exist, and daily bounces would hurt the sender's reputation.
 */

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["DRAFT", "CONFIRMED", "IN_PROGRESS"];
const DEDUPE_WINDOW_HOURS = 20;

export const REMINDER_TYPES = [
  "OVERDUE_RETURN",
  "RETURN_DUE_TODAY",
  "PICKUP_BALANCE_DUE",
  "ALTERATION_DUE",
  "CLEANING_DUE",
  "APPOINTMENT_TODAY",
] as const;
type ReminderType = (typeof REMINDER_TYPES)[number];

interface Reminder {
  userId: string;
  type: ReminderType;
  title: string;
  body: string;
  relatedEntityType: "Booking" | "TailoringJob" | "GarmentCleaningJob" | "Appointment";
  relatedEntityId: string;
}

export interface ReminderRunResult {
  organizations: number;
  created: number;
  skippedAsDuplicate: number;
  emailsSent: number;
  emailErrors: number;
}

export async function runDailyReminders(now = new Date()): Promise<ReminderRunResult> {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Suspended, cancelled or lapsed boutiques get nothing.
  const organizations = (
    await db.organization.findMany({ select: { id: true, status: true, currentPeriodEnd: true } })
  ).filter(isOrganizationActive);
  const orgIds = organizations.map((o) => o.id);

  const staff = await db.user.findMany({
    where: { organizationId: { in: orgIds }, isActive: true, role: { in: ["OWNER", "MANAGER", "SALES"] } },
    select: { id: true, role: true, branchId: true, organizationId: true },
  });
  const branches = await db.branch.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true, organizationId: true, currency: true },
  });
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const branchIds = branches.map((b) => b.id);

  // Owners hear about everything in their boutique; managers and front desk
  // only about their own branch (or every branch if they have none set).
  const people = (branchId: string, roles: Role[]) => {
    const orgId = branchById.get(branchId)?.organizationId;
    return staff
      .filter((u) => u.organizationId === orgId && roles.includes(u.role))
      .filter((u) => u.role === "OWNER" || !u.branchId || u.branchId === branchId)
      .map((u) => u.id);
  };

  const reminders: Reminder[] = [];
  const add = (userIds: (string | null | undefined)[], r: Omit<Reminder, "userId">) => {
    for (const userId of new Set(userIds.filter((id): id is string => Boolean(id)))) reminders.push({ userId, ...r });
  };
  const customerName = (c: { firstName: string; lastName: string }) => `${c.firstName} ${c.lastName}`.trim();

  const [overdueReturns, returnsToday, pickupsOwing, alterations, cleanings, appointments] = await Promise.all([
    db.booking.findMany({
      where: { branchId: { in: branchIds }, returnDate: { lt: todayStart }, status: "IN_PROGRESS" },
      include: { customer: { select: { firstName: true, lastName: true } } },
    }),
    db.booking.findMany({
      where: {
        branchId: { in: branchIds },
        returnDate: { gte: todayStart, lte: todayEnd },
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      include: { customer: { select: { firstName: true, lastName: true } } },
    }),
    db.booking.findMany({
      where: {
        branchId: { in: branchIds },
        pickupDate: { gte: todayStart, lte: todayEnd },
        status: { in: ACTIVE_BOOKING_STATUSES },
        balanceDue: { gt: 0 },
      },
      include: { customer: { select: { firstName: true, lastName: true } } },
    }),
    db.tailoringJob.findMany({
      where: { garment: { branchId: { in: branchIds } }, dueAt: { lte: todayEnd }, status: { not: "COMPLETED" } },
      include: { garment: { select: { sku: true, name: true, branchId: true } } },
    }),
    db.garmentCleaningJob.findMany({
      where: {
        garment: { branchId: { in: branchIds } },
        dueAt: { lte: todayEnd },
        status: { notIn: ["COMPLETED", "READY"] },
      },
      include: { garment: { select: { sku: true, name: true, branchId: true } } },
    }),
    db.appointment.findMany({
      where: {
        branchId: { in: branchIds },
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
        assignedStaffId: { not: null },
      },
      include: { customer: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  for (const b of overdueReturns) {
    const daysLate = differenceInCalendarDays(todayStart, b.returnDate!);
    add([...people(b.branchId, ["OWNER", "MANAGER"]), b.assignedStaffId], {
      type: "OVERDUE_RETURN",
      title: `Overdue return: ${b.bookingNumber}`,
      body: `${customerName(b.customer)} was due back ${format(b.returnDate!, "d MMM")} (${daysLate} day${daysLate === 1 ? "" : "s"} late).`,
      relatedEntityType: "Booking",
      relatedEntityId: b.id,
    });
  }

  for (const b of returnsToday) {
    add([...people(b.branchId, ["MANAGER"]), b.assignedStaffId], {
      type: "RETURN_DUE_TODAY",
      title: `Return due today: ${b.bookingNumber}`,
      body: `${customerName(b.customer)} is due to bring the garments back today.`,
      relatedEntityType: "Booking",
      relatedEntityId: b.id,
    });
  }

  for (const b of pickupsOwing) {
    const currency = branchById.get(b.branchId)?.currency ?? "AED";
    add([...people(b.branchId, ["MANAGER", "SALES"]), b.assignedStaffId], {
      type: "PICKUP_BALANCE_DUE",
      title: `Collect balance at pickup: ${b.bookingNumber}`,
      body: `${customerName(b.customer)} picks up today with ${formatMoney(b.balanceDue, currency)} still owed.`,
      relatedEntityType: "Booking",
      relatedEntityId: b.id,
    });
  }

  for (const job of alterations) {
    const overdue = job.dueAt! < todayStart;
    add([job.assignedToUserId, ...people(job.garment.branchId, ["MANAGER"])], {
      type: "ALTERATION_DUE",
      title: `${overdue ? "Alteration overdue" : "Alteration due today"}: ${job.garment.sku}`,
      body: `${job.garment.name}, due ${format(job.dueAt!, "d MMM")}. Status: ${enumLabel(job.status)}.`,
      relatedEntityType: "TailoringJob",
      relatedEntityId: job.id,
    });
  }

  for (const job of cleanings) {
    const overdue = job.dueAt! < todayStart;
    add([job.assignedToUserId, ...people(job.garment.branchId, ["MANAGER"])], {
      type: "CLEANING_DUE",
      title: `${overdue ? "Cleaning overdue" : "Cleaning due today"}: ${job.garment.sku}`,
      body: `${job.garment.name}, due ${format(job.dueAt!, "d MMM")}. Status: ${enumLabel(job.status)}.`,
      relatedEntityType: "GarmentCleaningJob",
      relatedEntityId: job.id,
    });
  }

  for (const a of appointments) {
    add([a.assignedStaffId], {
      type: "APPOINTMENT_TODAY",
      title: `${enumLabel(a.type)} at ${format(a.scheduledAt, "HH:mm")}`,
      body: `With ${customerName(a.customer)} today.`,
      relatedEntityType: "Appointment",
      relatedEntityId: a.id,
    });
  }

  // Drop anything this person was already told about recently.
  const recent = await db.notification.findMany({
    where: {
      type: { in: [...REMINDER_TYPES] },
      createdAt: { gte: addHours(now, -DEDUPE_WINDOW_HOURS) },
      userId: { in: [...new Set(reminders.map((r) => r.userId))] },
    },
    select: { userId: true, type: true, relatedEntityId: true },
  });
  const seen = new Set(recent.map((n) => `${n.userId}|${n.type}|${n.relatedEntityId}`));
  const fresh = reminders.filter((r) => !seen.has(`${r.userId}|${r.type}|${r.relatedEntityId}`));

  if (fresh.length > 0) {
    await db.notification.createMany({ data: fresh });
    await db.appointment.updateMany({
      where: { id: { in: fresh.filter((r) => r.type === "APPOINTMENT_TODAY").map((r) => r.relatedEntityId) } },
      data: { reminderSentAt: now },
    });
  }

  const emailOn = isEmailConfigured() && process.env.REMINDER_EMAILS === "on";
  const { sent, errors } = emailOn ? await emailDigests(fresh, now) : { sent: 0, errors: 0 };

  return {
    organizations: organizations.length,
    created: fresh.length,
    skippedAsDuplicate: reminders.length - fresh.length,
    emailsSent: sent,
    emailErrors: errors,
  };
}

/** One email per person listing their new reminders. Failures are counted, not thrown. */
async function emailDigests(reminders: Reminder[], now: Date) {
  const byUser = new Map<string, Reminder[]>();
  for (const r of reminders) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  if (byUser.size === 0) return { sent: 0, errors: 0 };

  const users = await db.user.findMany({
    where: { id: { in: [...byUser.keys()] } },
    select: { id: true, email: true, name: true },
  });
  const appUrl = trustedAppUrl();
  const day = format(now, "EEEE d MMMM");
  let sent = 0;
  let errors = 0;

  for (const user of users) {
    const items = byUser.get(user.id)!;
    const subject = `${items.length} reminder${items.length === 1 ? "" : "s"} for ${day}`;
    const text = [
      `Hi ${user.name.split(" ")[0]},`,
      "",
      `Here's what needs attention today:`,
      "",
      ...items.map((r) => `- ${r.title}: ${r.body}`),
      "",
      appUrl ? `Open the app: ${appUrl}` : "",
    ].join("\n");
    const html = `<p>Hi ${escapeHtml(user.name.split(" ")[0])},</p>
<p>Here's what needs attention today:</p>
<ul>${items.map((r) => `<li><strong>${escapeHtml(r.title)}</strong><br>${escapeHtml(r.body)}</li>`).join("")}</ul>
${appUrl ? `<p><a href="${escapeHtml(appUrl)}">Open the app</a></p>` : ""}`;

    const result = await sendEmail({ to: user.email, subject, text, html, fromName: "Bridal Rental OS" });
    if (result.ok) sent++;
    else errors++;
  }
  return { sent, errors };
}
