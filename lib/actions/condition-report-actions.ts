"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCan, permissionError } from "@/lib/permissions";
import { changeGarmentStatus } from "@/lib/actions/garment-actions";
import { conditionReportSchema, damageChargeSchema } from "@/lib/validations/condition-report";
import { getStorageAdapter } from "@/lib/storage";
import { notifyUsers } from "@/lib/notify";
import type { ActionState } from "@/lib/actions/customer-actions";
import type { DamageChargeStatus, RepairStatus } from "@prisma/client";

/**
 * Logs an inspection, updates the garment's live condition score, and moves
 * it into the repair or cleaning queue depending on what was found — the
 * same fork the spec's lifecycle diagram shows after RETURNED. Reuses
 * changeGarmentStatus (garment-actions.ts) rather than duplicating the
 * status-history bookkeeping.
 */
export async function createConditionReport(garmentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "conditionReports", "create");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = conditionReportSchema.safeParse({
    ...raw,
    damageCategories: formData.getAll("damageCategories"),
  });
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const hasDamage = parsed.data.damageCategories.length > 0;

  const photoFile = formData.get("photo") as File | null;
  let photoUrl: string | null = null;
  if (photoFile && photoFile.size > 0) {
    const buffer = Buffer.from(await photoFile.arrayBuffer());
    const storage = getStorageAdapter();
    const uploaded = await storage.uploadFile(buffer, {
      filename: photoFile.name,
      contentType: photoFile.type,
      folder: `condition-reports/${garmentId}`,
    });
    photoUrl = uploaded.url;
  }

  await db.$transaction(async (tx) => {
    const created = await tx.garmentConditionReport.create({
      data: {
        garmentId,
        bookingId: parsed.data.bookingId || null,
        reportType: parsed.data.reportType,
        conditionScore: parsed.data.conditionScore,
        damageCategories: parsed.data.damageCategories,
        description: parsed.data.description || null,
        estimatedCost: parsed.data.estimatedCost,
        photos: photoUrl ? [photoUrl] : [],
        inspectedByUserId: session.user.id,
      },
    });

    if (hasDamage) {
      await tx.garmentRepair.createMany({
        data: parsed.data.damageCategories.map((category) => ({
          garmentId,
          conditionReportId: created.id,
          description: `${category.replaceAll("_", " ")} noted during inspection`,
        })),
      });
    }

    await tx.garment.update({ where: { id: garmentId }, data: { conditionScore: parsed.data.conditionScore } });

    return created;
  });

  await changeGarmentStatus(
    garmentId,
    hasDamage ? "REPAIR_REQUIRED" : "CLEANING_REQUIRED",
    `Condition inspection: ${parsed.data.conditionScore}/10${hasDamage ? ` — ${parsed.data.damageCategories.join(", ")}` : ""}`
  );

  updateTag("reports");
  revalidatePath(`/dashboard/garments/${garmentId}`);
  if (parsed.data.bookingId) revalidatePath(`/dashboard/bookings/${parsed.data.bookingId}`);
  return {};
}

export async function createDamageCharge(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "conditionReports", "create");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = damageChargeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const booking = await db.booking.findUniqueOrThrow({ where: { id: parsed.data.bookingId } });

  await db.damageCharge.create({
    data: {
      bookingId: parsed.data.bookingId,
      conditionReportId: parsed.data.conditionReportId || null,
      category: parsed.data.category,
      description: parsed.data.description || null,
      amount: parsed.data.amount,
    },
  });

  const approvers = await db.user.findMany({
    where: { OR: [{ role: "OWNER" }, { role: "MANAGER", branchId: booking.branchId }] },
    select: { id: true },
  });
  await notifyUsers(
    approvers.map((u) => u.id),
    {
      type: "DAMAGE_CHARGE_RAISED",
      title: "New damage charge needs approval",
      body: `${parsed.data.category} — ${booking.bookingNumber}`,
      relatedEntityType: "Booking",
      relatedEntityId: booking.id,
    }
  );

  revalidatePath(`/dashboard/bookings/${parsed.data.bookingId}`);
  return {};
}

export async function updateDamageChargeStatus(
  chargeId: string,
  status: DamageChargeStatus,
  approvedAmount?: number
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "conditionReports", "update");
  if (permissionMsg) return { error: permissionMsg };

  const charge = await db.damageCharge.update({
    where: { id: chargeId },
    data: {
      status,
      approvedByUserId: session.user.id,
      approvedAmount: approvedAmount ?? undefined,
    },
  });

  revalidatePath(`/dashboard/bookings/${charge.bookingId}`);
  return {};
}

export async function updateRepairStatus(repairId: string, status: RepairStatus, cost?: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "conditionReports", "update");

  const repair = await db.garmentRepair.findUniqueOrThrow({ where: { id: repairId } });
  const finalCost = cost ?? Number(repair.cost);

  await db.$transaction(async (tx) => {
    await tx.garmentRepair.update({
      where: { id: repairId },
      data: {
        status,
        cost: finalCost,
        startedAt: repair.startedAt ?? (status !== "REQUIRED" ? new Date() : null),
        completedAt: status === "COMPLETED" ? new Date() : repair.completedAt,
      },
    });

    if (status === "COMPLETED") {
      await tx.garment.update({
        where: { id: repair.garmentId },
        data: { repairCostTotal: { increment: finalCost } },
      });
    }
  });

  if (status === "COMPLETED") {
    await changeGarmentStatus(repair.garmentId, "CLEANING_REQUIRED", "Repair completed");
  }

  updateTag("dashboard");
  revalidatePath(`/dashboard/garments/${repair.garmentId}`);
}
