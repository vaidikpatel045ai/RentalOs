"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCan, permissionError } from "@/lib/permissions";
import { packageSchema, packageItemSchema } from "@/lib/validations/package";
import type { ActionState } from "@/lib/actions/customer-actions";
import type { GarmentCategory } from "@prisma/client";

export async function createPackage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "packages", "create");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const pkg = await db.package.create({
    data: {
      branchId: parsed.data.branchId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
    },
  });

  updateTag("packages");
  revalidatePath("/dashboard/packages");
  redirect(`/dashboard/packages/${pkg.id}/edit`);
}

export async function updatePackage(packageId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "packages", "update");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.package.update({
    where: { id: packageId },
    data: {
      branchId: parsed.data.branchId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
    },
  });

  updateTag("packages");
  revalidatePath(`/dashboard/packages/${packageId}/edit`);
  revalidatePath("/dashboard/packages");
  return {};
}

export async function togglePackageActive(packageId: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "packages", "update");

  await db.package.update({ where: { id: packageId }, data: { isActive } });

  updateTag("packages");
  revalidatePath("/dashboard/packages");
}

export async function deletePackage(packageId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "packages", "delete");

  await db.package.delete({ where: { id: packageId } });

  updateTag("packages");
  revalidatePath("/dashboard/packages");
}

export async function addPackageItem(packageId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "packages", "update");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = packageItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.packageItem.create({
    data: {
      packageId,
      name: parsed.data.name,
      garmentCategory: (parsed.data.garmentCategory || null) as GarmentCategory | null,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/dashboard/packages/${packageId}/edit`);
  return {};
}

export async function removePackageItem(itemId: string, packageId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "packages", "update");

  await db.packageItem.delete({ where: { id: itemId } });

  revalidatePath(`/dashboard/packages/${packageId}/edit`);
}
