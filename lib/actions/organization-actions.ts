"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationOnboardSchema, organizationBillingSchema } from "@/lib/validations/organization";
import type { ActionState } from "@/lib/actions/customer-actions";
import type { OrganizationStatus } from "@prisma/client";

async function requirePlatformAdmin() {
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

/** Onboards a new boutique: Organization + its first Owner + its first
 * Branch, created together so there's never a tenant with no way in. */
export async function createOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") return { error: "Not authorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = organizationOnboardSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const existingEmail = await db.user.findUnique({ where: { email: data.ownerEmail.toLowerCase().trim() } });
  if (existingEmail) return { error: "A user with this email already exists." };

  const passwordHash = await bcrypt.hash(data.ownerPassword, 10);

  const organization = await db.organization.create({
    data: {
      name: data.organizationName,
      planId: data.planId || null,
      status: "TRIAL",
    },
  });

  await db.branch.create({
    data: {
      organizationId: organization.id,
      name: data.name,
      code: data.code,
      country: data.country,
      currency: data.currency,
      timezone: data.timezone,
      locale: data.locale,
      taxLabel: data.taxLabel,
      taxRate: data.taxRate,
      city: data.city || null,
      stateOrRegion: data.stateOrRegion || null,
      addressLine1: data.addressLine1 || null,
      phone: data.phone || null,
      email: data.email || null,
      settings: { create: {} },
    },
  });

  await db.user.create({
    data: {
      name: data.ownerName,
      email: data.ownerEmail.toLowerCase().trim(),
      passwordHash,
      role: "OWNER",
      organizationId: organization.id,
      branchId: null,
    },
  });

  revalidatePath("/admin");
  redirect(`/admin/organizations/${organization.id}`);
}

export async function updateOrganizationBilling(
  organizationId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") return { error: "Not authorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = organizationBillingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.organization.update({
    where: { id: organizationId },
    data: {
      planId: parsed.data.planId || null,
      status: parsed.data.status,
      billingNotes: parsed.data.billingNotes || null,
    },
  });

  revalidatePath(`/admin/organizations/${organizationId}`);
  revalidatePath("/admin");
  return {};
}

export async function setOrganizationStatus(organizationId: string, status: OrganizationStatus) {
  await requirePlatformAdmin();
  await db.organization.update({ where: { id: organizationId }, data: { status } });
  revalidatePath(`/admin/organizations/${organizationId}`);
  revalidatePath("/admin");
}

/** Marks the current period paid — for a MONTHLY plan this pushes the
 * access cutoff a month out; for everything else it just confirms ACTIVE,
 * since there's no cutoff to extend. */
export async function markOrganizationPaid(organizationId: string) {
  await requirePlatformAdmin();
  const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId }, include: { plan: true } });

  const base = org.currentPeriodEnd && org.currentPeriodEnd.getTime() > Date.now() ? org.currentPeriodEnd : new Date();
  const nextPeriodEnd =
    org.plan?.billingInterval === "MONTHLY" ? new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

  await db.organization.update({
    where: { id: organizationId },
    data: { status: "ACTIVE", currentPeriodEnd: nextPeriodEnd },
  });

  revalidatePath(`/admin/organizations/${organizationId}`);
  revalidatePath("/admin");
}
