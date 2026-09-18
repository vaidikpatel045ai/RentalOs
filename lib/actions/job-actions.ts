"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCan, permissionError } from "@/lib/permissions";
import type { CleaningStatus, DeliveryStatus, TailoringStatus } from "@prisma/client";
import type { ActionState } from "@/lib/actions/customer-actions";
import { tailoringJobSchema, cleaningJobSchema, deliveryJobSchema } from "@/lib/validations/job";
import { snapshotMeasurement, type MeasurementSnapshot } from "@/lib/measurements";
import { getStorageAdapter } from "@/lib/storage";
import type { Prisma } from "@prisma/client";

/** TAILOR/CLEANER may only touch jobs assigned to them; OWNER/MANAGER can
 * always override from the admin boards. Defense-in-depth alongside the
 * role-level `requireCan` check — the portal UI already only lists a
 * worker's own jobs, but the server action must not trust that alone. */
function assertOwnsJob(role: string, assignedToUserId: string | null, userId: string) {
  if ((role === "TAILOR" || role === "CLEANER" || role === "DELIVERY") && assignedToUserId !== userId) {
    throw new Error("This job isn't assigned to you.");
  }
}

/**
 * The operational spine connecting the tailor/cleaner/delivery portals AND
 * the admin Tailoring/Cleaning/Delivery boards back to garment state — spec
 * section 38 ("A status change must update relevant dashboards"). Every
 * status transition here is the single place garment state changes as a
 * result of tailoring/cleaning/delivery progress, so the two can never
 * drift apart regardless of which surface (portal or admin board) triggered it.
 */

export async function updateTailoringStatus(jobId: string, status: TailoringStatus) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "tailoring", "update");

  const job = await db.tailoringJob.findUniqueOrThrow({ where: { id: jobId } });
  assertOwnsJob(session.user.role, job.assignedToUserId, session.user.id);

  await db.$transaction(async (tx) => {
    await tx.tailoringJob.update({
      where: { id: jobId },
      data: {
        status,
        startedAt: job.startedAt ?? (status !== "ASSIGNED" ? new Date() : null),
        completedAt: status === "COMPLETED" ? new Date() : job.completedAt,
      },
    });

    if (status === "COMPLETED") {
      const garment = await tx.garment.findUniqueOrThrow({ where: { id: job.garmentId } });
      await tx.garment.update({ where: { id: job.garmentId }, data: { currentStatus: "READY_FOR_FITTING" } });
      await tx.garmentStatusHistory.create({
        data: {
          garmentId: job.garmentId,
          fromStatus: garment.currentStatus,
          toStatus: "READY_FOR_FITTING",
          changedByUserId: session.user.id,
          changedByRole: session.user.role,
          notes: "Tailoring completed",
        },
      });
    }
  });

  updateTag("dashboard");
  revalidatePath("/portal/tailor");
  revalidatePath("/dashboard/tailoring");
}

export async function updateCleaningStatus(jobId: string, status: CleaningStatus) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "cleaning", "update");

  const job = await db.garmentCleaningJob.findUniqueOrThrow({ where: { id: jobId } });
  assertOwnsJob(session.user.role, job.assignedToUserId, session.user.id);

  await db.$transaction(async (tx) => {
    await tx.garmentCleaningJob.update({
      where: { id: jobId },
      data: {
        status,
        startedAt: job.startedAt ?? (status !== "RECEIVED" ? new Date() : null),
        completedAt: status === "COMPLETED" ? new Date() : job.completedAt,
      },
    });

    if (status === "READY" || status === "COMPLETED") {
      const garment = await tx.garment.findUniqueOrThrow({ where: { id: job.garmentId } });
      await tx.garment.update({ where: { id: job.garmentId }, data: { currentStatus: "AVAILABLE" } });
      await tx.garmentStatusHistory.create({
        data: {
          garmentId: job.garmentId,
          fromStatus: garment.currentStatus,
          toStatus: "AVAILABLE",
          changedByUserId: session.user.id,
          changedByRole: session.user.role,
          notes: "Cleaning completed — quality checked and available again",
        },
      });
    } else if (status === "QUALITY_CHECK") {
      await tx.garment.update({ where: { id: job.garmentId }, data: { currentStatus: "QUALITY_CHECK" } });
    }
  });

  updateTag("dashboard");
  revalidatePath("/portal/cleaner");
  revalidatePath("/dashboard/cleaning");
}

export async function updateDeliveryStatus(jobId: string, status: DeliveryStatus) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "delivery", "update");

  const existingJob = await db.deliveryJob.findUniqueOrThrow({ where: { id: jobId } });
  assertOwnsJob(session.user.role, existingJob.assignedDriverId, session.user.id);

  await db.deliveryJob.update({
    where: { id: jobId },
    data: {
      status,
      actualPickupAt: status === "PICKED_UP" ? new Date() : undefined,
      actualDeliveredAt: status === "DELIVERED" ? new Date() : undefined,
    },
  });

  revalidatePath("/portal/delivery");
  revalidatePath("/dashboard/delivery");
}

// ─────────────────────────────────────────────────────────────────────────
// CREATE — admin-side job assignment (Tailoring/Cleaning/Delivery boards)
// ─────────────────────────────────────────────────────────────────────────

export async function createTailoringJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const createPermMsg = permissionError(session.user.role, "tailoring", "create");
  if (createPermMsg) return { error: createPermMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = tailoringJobSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { hem, bust, waist, straps, length, notes, ...data } = parsed.data;

  const instructions: Record<string, string> = {};
  if (hem) instructions.hem = hem;
  if (bust) instructions.bust = bust;
  if (waist) instructions.waist = waist;
  if (straps) instructions.straps = straps;
  if (length) instructions.length = length;

  const [garment, latestMeasurement] = await Promise.all([
    db.garment.findUniqueOrThrow({ where: { id: data.garmentId } }),
    data.customerId
      ? db.customerMeasurement.findFirst({ where: { customerId: data.customerId, isLatest: true } })
      : Promise.resolve(null),
  ]);

  // Snapshot the bride's measurements onto the job so the tailor has them
  // without needing customer-record access (spec: tailors see only what a
  // job requires — see lib/permissions.ts "tailoring" resource).
  const measurementSnapshot: MeasurementSnapshot | null = latestMeasurement ? snapshotMeasurement(latestMeasurement) : null;

  await db.$transaction(async (tx) => {
    await tx.tailoringJob.create({
      data: {
        garmentId: data.garmentId,
        bookingId: data.bookingId || null,
        customerId: data.customerId || null,
        assignedToUserId: data.assignedToUserId || null,
        priority: data.priority,
        dueAt: data.dueAt,
        instructions: Object.keys(instructions).length > 0 ? instructions : undefined,
        beforeMeasurements: measurementSnapshot ? (measurementSnapshot as unknown as Prisma.InputJsonValue) : undefined,
        notes: notes || null,
        status: "ASSIGNED",
      },
    });

    if (garment.currentStatus !== "WITH_TAILOR" && garment.currentStatus !== "ALTERATION_REQUIRED") {
      await tx.garment.update({ where: { id: data.garmentId }, data: { currentStatus: "WITH_TAILOR" } });
      await tx.garmentStatusHistory.create({
        data: {
          garmentId: data.garmentId,
          fromStatus: garment.currentStatus,
          toStatus: "WITH_TAILOR",
          changedByUserId: session.user.id,
          changedByRole: session.user.role,
          notes: "Tailoring job assigned",
        },
      });
    }
  });

  updateTag("dashboard");
  revalidatePath("/dashboard/tailoring");
  redirect("/dashboard/tailoring");
}

export async function createCleaningJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const createPermMsg = permissionError(session.user.role, "cleaning", "create");
  if (createPermMsg) return { error: createPermMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = cleaningJobSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const garment = await db.garment.findUniqueOrThrow({ where: { id: data.garmentId } });

  await db.$transaction(async (tx) => {
    await tx.garmentCleaningJob.create({
      data: {
        garmentId: data.garmentId,
        bookingId: data.bookingId || null,
        assignedToUserId: data.assignedToUserId || null,
        cleaningType: data.cleaningType,
        priority: data.priority,
        dueAt: data.dueAt,
        stainNotes: data.stainNotes || null,
        instructions: data.instructions || null,
        status: "RECEIVED",
      },
    });

    if (garment.currentStatus !== "CLEANING" && garment.currentStatus !== "CLEANING_REQUIRED") {
      await tx.garment.update({ where: { id: data.garmentId }, data: { currentStatus: "CLEANING" } });
      await tx.garmentStatusHistory.create({
        data: {
          garmentId: data.garmentId,
          fromStatus: garment.currentStatus,
          toStatus: "CLEANING",
          changedByUserId: session.user.id,
          changedByRole: session.user.role,
          notes: "Cleaning job created",
        },
      });
    }
  });

  updateTag("dashboard");
  revalidatePath("/dashboard/cleaning");
  redirect("/dashboard/cleaning");
}

/**
 * Numeric-max-based (not count-based) so a sparse or seeded numbering
 * sequence (e.g. seed data starting at DL-102) can never collide with a
 * freshly generated number the way a plain `count()` offset can.
 */
async function nextDeliveryJobNumber(): Promise<string> {
  const existing = await db.deliveryJob.findMany({
    where: { jobNumber: { startsWith: "DL-" } },
    select: { jobNumber: true },
  });
  const maxNum = existing.reduce((max, { jobNumber }) => {
    const n = parseInt(jobNumber.replace("DL-", ""), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 100);
  return `DL-${maxNum + 1}`;
}

export async function createDeliveryJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const createPermMsg = permissionError(session.user.role, "delivery", "create");
  if (createPermMsg) return { error: createPermMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = deliveryJobSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  // Retry on the rare race where two jobs are created concurrently and both
  // compute the same "next" number before either commits.
  for (let attempt = 0; attempt < 3; attempt++) {
    const jobNumber = await nextDeliveryJobNumber();
    try {
      await db.deliveryJob.create({
        data: {
          bookingId: data.bookingId,
          jobNumber,
          type: data.type,
          assignedDriverId: data.assignedDriverId || null,
          address: data.address || null,
          phone: data.phone || null,
          scheduledDate: data.scheduledDate,
          windowStart: data.windowStart,
          windowEnd: data.windowEnd,
          notes: data.notes || null,
          status: "ASSIGNED",
        },
      });
      break;
    } catch (error) {
      const isUniqueClash =
        error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
      if (!isUniqueClash || attempt === 2) {
        return { error: "Could not create delivery job. Please try again." };
      }
    }
  }

  revalidatePath("/dashboard/delivery");
  redirect("/dashboard/delivery");
}

// ─────────────────────────────────────────────────────────────────────────
// PORTAL — tailor/cleaner working the job (notes, photos, cost)
// ─────────────────────────────────────────────────────────────────────────

/** Adds a progress note to a tailoring job, with optional photos — the
 * "before/after measurement, photos, checklists" workflow from the spec,
 * using the TailoringNote thread that already existed in the schema. */
export async function addTailoringNote(jobId: string, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const updatePermMsg = permissionError(session.user.role, "tailoring", "update");
  if (updatePermMsg) return { error: updatePermMsg };

  const job = await db.tailoringJob.findUniqueOrThrow({ where: { id: jobId } });
  try {
    assertOwnsJob(session.user.role, job.assignedToUserId, session.user.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const note = String(formData.get("note") ?? "").trim();
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!note && files.length === 0) return { error: "Add a note or at least one photo." };

  const storage = getStorageAdapter();
  const photos: string[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await storage.uploadFile(buffer, {
      filename: file.name,
      contentType: file.type,
      folder: `tailoring/${jobId}`,
    });
    photos.push(url);
  }

  await db.tailoringNote.create({
    data: { tailoringJobId: jobId, authorUserId: session.user.id, note: note || "Photo update", photos },
  });

  revalidatePath("/portal/tailor");
  revalidatePath("/dashboard/tailoring");
  return {};
}

/** Appends one before/after photo to a cleaning job (atomic array push —
 * safe even if the tailor/cleaner uploads several photos back to back). */
export async function addCleaningPhoto(jobId: string, kind: "before" | "after", formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const updatePermMsg = permissionError(session.user.role, "cleaning", "update");
  if (updatePermMsg) return { error: updatePermMsg };

  const job = await db.garmentCleaningJob.findUniqueOrThrow({ where: { id: jobId } });
  try {
    assertOwnsJob(session.user.role, job.assignedToUserId, session.user.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a photo." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageAdapter();
  const { url } = await storage.uploadFile(buffer, {
    filename: file.name,
    contentType: file.type,
    folder: `cleaning/${jobId}`,
  });

  await db.garmentCleaningJob.update({
    where: { id: jobId },
    data: kind === "before" ? { beforePhotos: { push: url } } : { afterPhotos: { push: url } },
  });

  revalidatePath("/portal/cleaner");
  revalidatePath("/dashboard/cleaning");
  return {};
}

/** Cleaner records actual cost and closing notes — independent of the
 * status transition so it can be filled in at any point in the job. */
export async function updateCleaningDetails(jobId: string, input: { cost?: number; notes?: string }): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const updatePermMsg = permissionError(session.user.role, "cleaning", "update");
  if (updatePermMsg) return { error: updatePermMsg };

  const job = await db.garmentCleaningJob.findUniqueOrThrow({ where: { id: jobId } });
  try {
    assertOwnsJob(session.user.role, job.assignedToUserId, session.user.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  await db.garmentCleaningJob.update({
    where: { id: jobId },
    data: {
      cost: input.cost,
      notes: input.notes,
    },
  });

  revalidatePath("/portal/cleaner");
  revalidatePath("/dashboard/cleaning");
  return {};
}
