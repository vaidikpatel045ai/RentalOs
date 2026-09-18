"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { permissionError } from "@/lib/permissions";
import { branchSchema, branchSettingsSchema } from "@/lib/validations/branch";
import type { ActionState } from "@/lib/actions/customer-actions";

export async function createBranch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "branches", "create");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = branchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await db.branch.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { error: `Branch code ${parsed.data.code} already exists.` };

  await db.branch.create({
    data: {
      ...parsed.data,
      city: parsed.data.city || null,
      stateOrRegion: parsed.data.stateOrRegion || null,
      addressLine1: parsed.data.addressLine1 || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      settings: { create: {} },
    },
  });

  updateTag("branches");
  revalidatePath("/dashboard/branches");
  redirect(`/dashboard/branches`);
}

export async function updateBranch(branchId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "branches", "update");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = branchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.branch.update({
    where: { id: branchId },
    data: {
      ...parsed.data,
      city: parsed.data.city || null,
      stateOrRegion: parsed.data.stateOrRegion || null,
      addressLine1: parsed.data.addressLine1 || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    },
  });

  updateTag("branches");
  revalidatePath("/dashboard/branches");
  redirect(`/dashboard/branches`);
}

export async function updateBranchSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "settings", "update");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = branchSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { branchId, taxRate, taxLabel, ...settings } = parsed.data;

  await db.$transaction([
    db.branchSettings.upsert({
      where: { branchId },
      create: { branchId, ...settings },
      update: settings,
    }),
    db.branch.update({ where: { id: branchId }, data: { taxRate, taxLabel } }),
  ]);

  updateTag("branches");
  revalidatePath("/dashboard/settings");
  return {};
}
