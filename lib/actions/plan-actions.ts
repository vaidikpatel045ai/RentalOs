"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { planSchema } from "@/lib/validations/plan";
import type { ActionState } from "@/lib/actions/customer-actions";

async function requirePlatformAdmin() {
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function createPlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") return { error: "Not authorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.plan.create({
    data: {
      name: parsed.data.name,
      billingInterval: parsed.data.billingInterval,
      price: parsed.data.price,
      currency: parsed.data.currency,
      maxBranches: parsed.data.maxBranches || null,
    },
  });

  revalidatePath("/admin/plans");
  redirect("/admin/plans");
}

export async function updatePlan(planId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") return { error: "Not authorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.plan.update({
    where: { id: planId },
    data: {
      name: parsed.data.name,
      billingInterval: parsed.data.billingInterval,
      price: parsed.data.price,
      currency: parsed.data.currency,
      maxBranches: parsed.data.maxBranches || null,
    },
  });

  revalidatePath("/admin/plans");
  redirect("/admin/plans");
}

export async function togglePlanActive(planId: string, isActive: boolean) {
  await requirePlatformAdmin();
  await db.plan.update({ where: { id: planId }, data: { isActive } });
  revalidatePath("/admin/plans");
}
