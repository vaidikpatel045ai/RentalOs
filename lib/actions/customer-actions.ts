"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { permissionError } from "@/lib/permissions";
import { customerSchema, measurementSchema } from "@/lib/validations/customer";
import { canUseBranch, reachCustomer } from "@/lib/scope";

export type ActionState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function createCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "customers", "create");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = customerSchema.safeParse({
    ...raw,
    favoriteDesigners: raw.favoriteDesigners ? String(raw.favoriteDesigners).split(",").map((s) => s.trim()).filter(Boolean) : [],
  });
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (!(await canUseBranch(session.user, parsed.data.branchId))) return { error: "Choose one of your branches." };

  const customer = await db.customer.create({
    data: {
      ...parsed.data,
      whatsapp: parsed.data.whatsapp || null,
      email: parsed.data.email || null,
      nationality: parsed.data.nationality || null,
      weddingVenue: parsed.data.weddingVenue || null,
      eventType: parsed.data.eventType || null,
      stylePreferences: parsed.data.stylePreferences || null,
      notes: parsed.data.notes || null,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      userRole: session.user.role,
      action: "CREATE",
      entityType: "Customer",
      entityId: customer.id,
      newValue: { name: `${customer.firstName} ${customer.lastName}` },
    },
  });

  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${customer.id}`);
}

export async function updateCustomer(customerId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "customers", "update");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = customerSchema.safeParse({
    ...raw,
    favoriteDesigners: raw.favoriteDesigners ? String(raw.favoriteDesigners).split(",").map((s) => s.trim()).filter(Boolean) : [],
  });
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (!(await reachCustomer(session.user, customerId))) return { error: "Customer not found." };
  if (!(await canUseBranch(session.user, parsed.data.branchId))) return { error: "Choose one of your branches." };

  await db.customer.update({
    where: { id: customerId },
    data: {
      ...parsed.data,
      whatsapp: parsed.data.whatsapp || null,
      email: parsed.data.email || null,
      nationality: parsed.data.nationality || null,
      weddingVenue: parsed.data.weddingVenue || null,
      eventType: parsed.data.eventType || null,
      stylePreferences: parsed.data.stylePreferences || null,
      notes: parsed.data.notes || null,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      userRole: session.user.role,
      action: "UPDATE",
      entityType: "Customer",
      entityId: customerId,
    },
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}`);
  redirect(`/dashboard/customers/${customerId}`);
}

export async function addMeasurement(customerId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "customers", "update");
  if (permissionMsg) return { error: permissionMsg };

  if (!(await reachCustomer(session.user, customerId))) return { error: "Customer not found." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = measurementSchema.safeParse({ ...raw, customerId, verified: raw.verified === "on" });
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const latestVersion = await db.customerMeasurement.findFirst({
    where: { customerId },
    orderBy: { version: "desc" },
  });

  await db.$transaction([
    db.customerMeasurement.updateMany({ where: { customerId, isLatest: true }, data: { isLatest: false } }),
    db.customerMeasurement.create({
      data: {
        ...parsed.data,
        version: (latestVersion?.version ?? 0) + 1,
        isLatest: true,
        takenByUserId: session.user.id,
      },
    }),
  ]);

  revalidatePath(`/dashboard/customers/${customerId}`);
  return {};
}
