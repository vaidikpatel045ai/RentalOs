"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCan, permissionError } from "@/lib/permissions";
import { garmentSchema } from "@/lib/validations/garment";
import { garmentQrValue } from "@/lib/qr";
import { getStorageAdapter } from "@/lib/storage";
import type { GarmentStatus } from "@prisma/client";
import type { ActionState } from "@/lib/actions/customer-actions";

export async function createGarment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "garments", "create");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = garmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await db.garment.findUnique({ where: { sku: parsed.data.sku } });
  if (existing) {
    return { error: `SKU ${parsed.data.sku} already exists.` };
  }

  const garment = await db.garment.create({
    data: {
      ...parsed.data,
      designer: parsed.data.designer || null,
      collection: parsed.data.collection || null,
      brand: parsed.data.brand || null,
      size: parsed.data.size || null,
      sizeEU: parsed.data.sizeEU || null,
      sizeUS: parsed.data.sizeUS || null,
      color: parsed.data.color || null,
      fabric: parsed.data.fabric || null,
      style: parsed.data.style || null,
      season: parsed.data.season || null,
      notes: parsed.data.notes || null,
      qrCodeValue: garmentQrValue(parsed.data.sku),
      currentStatus: "AVAILABLE",
    },
  });

  await db.garmentStatusHistory.create({
    data: {
      garmentId: garment.id,
      toStatus: "AVAILABLE",
      changedByUserId: session.user.id,
      changedByRole: session.user.role,
      notes: "Garment added to inventory",
    },
  });

  updateTag("dashboard");
  updateTag("reports");
  revalidatePath("/dashboard/garments");
  redirect(`/dashboard/garments/${garment.id}`);
}

export async function updateGarment(garmentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "garments", "update");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = garmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.garment.update({
    where: { id: garmentId },
    data: {
      ...parsed.data,
      designer: parsed.data.designer || null,
      collection: parsed.data.collection || null,
      brand: parsed.data.brand || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/dashboard/garments/${garmentId}`);
  redirect(`/dashboard/garments/${garmentId}`);
}

export async function changeGarmentStatus(garmentId: string, newStatus: GarmentStatus, notes?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "garments", "update");

  const garment = await db.garment.findUniqueOrThrow({ where: { id: garmentId } });

  await db.$transaction([
    db.garment.update({
      where: { id: garmentId },
      // Keep isActive in sync with ARCHIVED regardless of which control set
      // the status (this dropdown or the dedicated Delete/Restore buttons
      // below both funnel through this same invariant).
      data: { currentStatus: newStatus, isActive: newStatus !== "ARCHIVED" },
    }),
    db.garmentStatusHistory.create({
      data: {
        garmentId,
        fromStatus: garment.currentStatus,
        toStatus: newStatus,
        changedByUserId: session.user.id,
        changedByRole: session.user.role,
        notes,
      },
    }),
  ]);

  updateTag("dashboard");
  updateTag("reports");
  revalidatePath(`/dashboard/garments/${garmentId}`);
  revalidatePath("/dashboard/garments");
}

/**
 * "Delete" a garment without destroying its rental history, revenue stats
 * or booking references — a hard delete would violate foreign-key
 * constraints on any garment that's ever been booked/cleaned/altered (i.e.
 * almost all of them). Archiving is the schema's built-in equivalent:
 * currentStatus -> ARCHIVED and isActive -> false, which is exactly what
 * every list screen already filters on. Fully reversible via restoreGarment.
 */
export async function deleteGarment(garmentId: string, notes?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "garments", "delete");

  const garment = await db.garment.findUniqueOrThrow({ where: { id: garmentId } });
  if (garment.currentStatus === "WITH_CUSTOMER" || garment.currentStatus === "OUT_FOR_DELIVERY") {
    throw new Error("This garment is currently with a customer — it can't be removed from inventory yet.");
  }

  await db.$transaction([
    db.garment.update({ where: { id: garmentId }, data: { currentStatus: "ARCHIVED", isActive: false } }),
    db.garmentStatusHistory.create({
      data: {
        garmentId,
        fromStatus: garment.currentStatus,
        toStatus: "ARCHIVED",
        changedByUserId: session.user.id,
        changedByRole: session.user.role,
        notes: notes || "Removed from active inventory",
      },
    }),
  ]);

  updateTag("dashboard");
  updateTag("reports");
  revalidatePath(`/dashboard/garments/${garmentId}`);
  revalidatePath("/dashboard/garments");
}

export async function restoreGarment(garmentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "garments", "update");

  const garment = await db.garment.findUniqueOrThrow({ where: { id: garmentId } });

  await db.$transaction([
    db.garment.update({ where: { id: garmentId }, data: { currentStatus: "AVAILABLE", isActive: true } }),
    db.garmentStatusHistory.create({
      data: {
        garmentId,
        fromStatus: garment.currentStatus,
        toStatus: "AVAILABLE",
        changedByUserId: session.user.id,
        changedByRole: session.user.role,
        notes: "Restored to active inventory",
      },
    }),
  ]);

  updateTag("dashboard");
  updateTag("reports");
  revalidatePath(`/dashboard/garments/${garmentId}`);
  revalidatePath("/dashboard/garments");
}

export async function uploadGarmentImage(garmentId: string, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "garments", "update");
  if (permissionMsg) return { error: permissionMsg };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose an image file." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageAdapter();
  const { url } = await storage.uploadFile(buffer, {
    filename: file.name,
    contentType: file.type,
    folder: `garments/${garmentId}`,
  });

  const count = await db.garmentImage.count({ where: { garmentId } });
  await db.garmentImage.create({
    data: { garmentId, url, isPrimary: count === 0, order: count },
  });

  revalidatePath(`/dashboard/garments/${garmentId}`);
  return {};
}
