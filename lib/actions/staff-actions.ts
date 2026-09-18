"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { permissionError } from "@/lib/permissions";
import { createStaffSchema, updateStaffSchema } from "@/lib/validations/staff";
import type { ActionState } from "@/lib/actions/customer-actions";

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "staff", "create");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = createStaffSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  const [existingEmail, existingCode] = await Promise.all([
    db.user.findUnique({ where: { email } }),
    db.staffProfile.findUnique({ where: { employeeCode: data.employeeCode } }),
  ]);
  if (existingEmail) return { error: "A user with this email already exists." };
  if (existingCode) return { error: `Employee code ${data.employeeCode} is already in use.` };

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await db.user.create({
    data: {
      name: data.name,
      email,
      passwordHash,
      role: data.role,
      branchId: data.branchId || null,
      phone: data.phone || null,
      staffProfile: {
        create: {
          employeeCode: data.employeeCode,
          title: data.title || null,
          department: data.department || null,
        },
      },
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      userRole: session.user.role,
      action: "CREATE",
      entityType: "User",
      entityId: user.id,
      newValue: { name: user.name, role: user.role },
    },
  });

  revalidatePath("/dashboard/staff");
  redirect("/dashboard/staff");
}

export async function updateStaff(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "staff", "update");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateStaffSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on" || raw.isActive === "true",
  });
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  const [existingEmail, existingCode] = await Promise.all([
    db.user.findFirst({ where: { email, id: { not: userId } } }),
    db.staffProfile.findFirst({ where: { employeeCode: data.employeeCode, userId: { not: userId } } }),
  ]);
  if (existingEmail) return { error: "Another user already uses this email." };
  if (existingCode) return { error: `Employee code ${data.employeeCode} is already in use.` };

  // Owner can't lock themselves out by deactivating or demoting their own account.
  if (userId === session.user.id && (!data.isActive || data.role !== "OWNER")) {
    return { error: "You can't deactivate or change the role of your own account." };
  }

  const passwordHash = data.newPassword ? await bcrypt.hash(data.newPassword, 10) : undefined;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email,
        role: data.role,
        branchId: data.branchId || null,
        phone: data.phone || null,
        isActive: data.isActive,
        ...(passwordHash ? { passwordHash } : {}),
      },
    }),
    db.staffProfile.upsert({
      where: { userId },
      create: {
        userId,
        employeeCode: data.employeeCode,
        title: data.title || null,
        department: data.department || null,
      },
      update: {
        employeeCode: data.employeeCode,
        title: data.title || null,
        department: data.department || null,
      },
    }),
  ]);

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      userRole: session.user.role,
      action: "UPDATE",
      entityType: "User",
      entityId: userId,
    },
  });

  revalidatePath("/dashboard/staff");
  redirect("/dashboard/staff");
}
