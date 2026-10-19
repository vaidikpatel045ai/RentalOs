"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCan, permissionError } from "@/lib/permissions";
import { supplierSchema } from "@/lib/validations/supplier";
import type { ActionState } from "@/lib/actions/customer-actions";
import { reachSupplier } from "@/lib/scope";

export async function createSupplier(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "suppliers", "create");
  if (permissionMsg) return { error: permissionMsg };
  if (!session.user.organizationId) return { error: "No organization on this account." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.supplier.create({
    data: {
      organizationId: session.user.organizationId,
      name: parsed.data.name,
      contactName: parsed.data.contactName || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
  });

  updateTag("suppliers");
  revalidatePath("/dashboard/suppliers");
  redirect("/dashboard/suppliers");
}

export async function updateSupplier(supplierId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "suppliers", "update");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (!(await reachSupplier(session.user, supplierId))) return { error: "Supplier not found." };

  await db.supplier.update({
    where: { id: supplierId },
    data: {
      name: parsed.data.name,
      contactName: parsed.data.contactName || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
  });

  updateTag("suppliers");
  revalidatePath("/dashboard/suppliers");
  redirect("/dashboard/suppliers");
}

export async function deleteSupplier(supplierId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "suppliers", "delete");
  if (!(await reachSupplier(session.user, supplierId))) throw new Error("Supplier not found.");

  await db.supplier.delete({ where: { id: supplierId } });

  updateTag("suppliers");
  revalidatePath("/dashboard/suppliers");
}
