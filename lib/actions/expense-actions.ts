"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCan, permissionError } from "@/lib/permissions";
import { getCachedBranches } from "@/lib/queries/branches";
import { expenseSchema, expenseDateFromInput } from "@/lib/validations/expense";
import type { ActionState } from "@/lib/actions/customer-actions";
import type { Role } from "@prisma/client";

type SessionUser = { id: string; role: Role; branchId: string | null; organizationId: string | null };

/** A non-owner may only touch their own branch; an owner, any branch in
 * their organization. Never trust the branchId from the form alone. */
async function canUseBranch(user: SessionUser, branchId: string): Promise<boolean> {
  if (user.role !== "OWNER") return user.branchId === branchId;
  const branches = await getCachedBranches(user.organizationId ?? "");
  return branches.some((b) => b.id === branchId);
}

export async function createExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "expenses", "create");
  if (permissionMsg) return { error: permissionMsg };

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (!(await canUseBranch(session.user, parsed.data.branchId))) {
    return { error: "You can't record expenses for that branch." };
  }

  await db.expense.create({
    data: {
      branchId: parsed.data.branchId,
      category: parsed.data.category,
      amount: parsed.data.amount,
      expenseDate: expenseDateFromInput(parsed.data.expenseDate),
      paymentMethod: parsed.data.paymentMethod,
      vendor: parsed.data.vendor || null,
      description: parsed.data.description || null,
      recordedByUserId: session.user.id,
    },
  });

  updateTag("profit-loss");
  revalidatePath("/dashboard/expenses");
  redirect("/dashboard/expenses");
}

export async function updateExpense(expenseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "expenses", "update");
  if (permissionMsg) return { error: permissionMsg };

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await db.expense.findUnique({ where: { id: expenseId } });
  if (!existing || !(await canUseBranch(session.user, existing.branchId)) || !(await canUseBranch(session.user, parsed.data.branchId))) {
    return { error: "Expense not found." };
  }

  await db.expense.update({
    where: { id: expenseId },
    data: {
      branchId: parsed.data.branchId,
      category: parsed.data.category,
      amount: parsed.data.amount,
      expenseDate: expenseDateFromInput(parsed.data.expenseDate),
      paymentMethod: parsed.data.paymentMethod,
      vendor: parsed.data.vendor || null,
      description: parsed.data.description || null,
    },
  });

  updateTag("profit-loss");
  revalidatePath("/dashboard/expenses");
  redirect("/dashboard/expenses");
}

export async function deleteExpense(expenseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "expenses", "delete");

  const existing = await db.expense.findUnique({ where: { id: expenseId } });
  if (!existing || !(await canUseBranch(session.user, existing.branchId))) throw new Error("Expense not found.");

  await db.expense.delete({ where: { id: expenseId } });

  updateTag("profit-loss");
  revalidatePath("/dashboard/expenses");
}
