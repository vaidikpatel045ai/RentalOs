"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCan, permissionError } from "@/lib/permissions";
import { getCachedBranches } from "@/lib/queries/branches";
import { packageSchema, packageItemSchema } from "@/lib/validations/package";
import type { ActionState } from "@/lib/actions/customer-actions";
import type { GarmentCategory, Role } from "@prisma/client";

type SessionUser = { role: Role; branchId: string | null; organizationId: string | null };

/** A manager works in their own branch; the owner, any branch in their
 * organization. Never trust a branchId (or a package id) from the client alone. */
async function canUseBranch(user: SessionUser, branchId: string): Promise<boolean> {
  if (user.role !== "OWNER") return user.branchId === branchId;
  const branches = await getCachedBranches(user.organizationId ?? "");
  return branches.some((b) => b.id === branchId);
}

async function findOwnedPackage(user: SessionUser, packageId: string) {
  const pkg = await db.package.findUnique({ where: { id: packageId }, select: { id: true, branchId: true, isDraft: true } });
  return pkg && (await canUseBranch(user, pkg.branchId)) ? pkg : null;
}

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
  if (!(await canUseBranch(session.user, parsed.data.branchId))) {
    return { error: "You can't create packages for that branch." };
  }

  const isDraft = parsed.data.intent === "draft";
  const pkg = await db.package.create({
    data: {
      branchId: parsed.data.branchId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price ?? null,
      isDraft,
      // A draft isn't on offer yet; it becomes active when it's published.
      isActive: !isDraft,
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
  const existing = await findOwnedPackage(session.user, packageId);
  if (!existing || !(await canUseBranch(session.user, parsed.data.branchId))) {
    return { error: "Package not found." };
  }

  const isDraft = parsed.data.intent === "draft";
  await db.package.update({
    where: { id: packageId },
    data: {
      branchId: parsed.data.branchId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price ?? null,
      isDraft,
      // Publishing a draft puts it on offer; saving a published package leaves isActive alone.
      ...(existing.isDraft && !isDraft ? { isActive: true } : {}),
      ...(isDraft ? { isActive: false } : {}),
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
  const existing = await findOwnedPackage(session.user, packageId);
  if (!existing) throw new Error("Package not found.");
  if (existing.isDraft && isActive) throw new Error("Publish this draft before activating it.");

  await db.package.update({ where: { id: packageId }, data: { isActive } });

  updateTag("packages");
  revalidatePath("/dashboard/packages");
}

export async function deletePackage(packageId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "packages", "delete");
  if (!(await findOwnedPackage(session.user, packageId))) throw new Error("Package not found.");

  await db.package.delete({ where: { id: packageId } });

  updateTag("packages");
  revalidatePath("/dashboard/packages");
}

export async function addPackageItem(packageId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "packages", "update");
  if (permissionMsg) return { error: permissionMsg };
  if (!(await findOwnedPackage(session.user, packageId))) return { error: "Package not found." };

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
  if (!(await findOwnedPackage(session.user, packageId))) throw new Error("Package not found.");

  // Scoped to the package, so an item id from another package can't be removed through this one.
  await db.packageItem.deleteMany({ where: { id: itemId, packageId } });

  revalidatePath(`/dashboard/packages/${packageId}/edit`);
}
