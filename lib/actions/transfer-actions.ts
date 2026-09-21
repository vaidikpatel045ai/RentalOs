"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCan, permissionError } from "@/lib/permissions";
import { transferSchema } from "@/lib/validations/transfer";
import { notifyUsers } from "@/lib/notify";
import type { ActionState } from "@/lib/actions/customer-actions";

export async function requestTransfer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "transfers", "create");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = transferSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const garment = await db.garment.findUniqueOrThrow({ where: { id: parsed.data.garmentId } });
  if (garment.branchId === parsed.data.toBranchId) {
    return { error: "This garment is already at that branch." };
  }

  const transfer = await db.inventoryTransfer.create({
    data: {
      garmentId: parsed.data.garmentId,
      fromBranchId: garment.branchId,
      toBranchId: parsed.data.toBranchId,
      notes: parsed.data.notes || null,
      requestedByUserId: session.user.id,
    },
  });

  const owners = await db.user.findMany({ where: { role: "OWNER" }, select: { id: true } });
  await notifyUsers(
    owners.map((u) => u.id),
    {
      type: "TRANSFER_REQUESTED",
      title: "Inventory transfer needs approval",
      body: `${garment.sku} requested for transfer`,
      relatedEntityType: "InventoryTransfer",
      relatedEntityId: transfer.id,
    }
  );

  updateTag("transfers");
  revalidatePath("/dashboard/transfers");
  redirect("/dashboard/transfers");
}

export async function approveTransfer(transferId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "transfers", "approve");

  await db.inventoryTransfer.update({
    where: { id: transferId },
    data: { status: "APPROVED", approvedByUserId: session.user.id },
  });

  updateTag("transfers");
  revalidatePath("/dashboard/transfers");
}

export async function rejectTransfer(transferId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "transfers", "approve");

  await db.inventoryTransfer.update({
    where: { id: transferId },
    data: { status: "REJECTED", approvedByUserId: session.user.id, resolvedAt: new Date() },
  });

  updateTag("transfers");
  revalidatePath("/dashboard/transfers");
}

export async function markTransferInTransit(transferId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "transfers", "update");

  await db.inventoryTransfer.update({ where: { id: transferId }, data: { status: "IN_TRANSIT" } });

  updateTag("transfers");
  revalidatePath("/dashboard/transfers");
}

/** The only step that actually moves the garment — everything before this is
 * just a paper trail so a branch isn't surprised by inventory disappearing. */
export async function markTransferReceived(transferId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "transfers", "update");

  const transfer = await db.inventoryTransfer.findUniqueOrThrow({ where: { id: transferId } });

  await db.$transaction([
    db.inventoryTransfer.update({ where: { id: transferId }, data: { status: "RECEIVED", resolvedAt: new Date() } }),
    db.garment.update({ where: { id: transfer.garmentId }, data: { branchId: transfer.toBranchId } }),
    db.garmentLocation.create({
      data: {
        garmentId: transfer.garmentId,
        locationLabel: "Showroom Floor",
        movedByUserId: session.user.id,
        notes: "Received via inter-branch transfer",
      },
    }),
  ]);

  updateTag("transfers");
  updateTag("dashboard");
  revalidatePath("/dashboard/transfers");
  revalidatePath(`/dashboard/garments/${transfer.garmentId}`);
}
