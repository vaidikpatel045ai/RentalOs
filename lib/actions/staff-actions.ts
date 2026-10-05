"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { permissionError } from "@/lib/permissions";
import { createStaffSchema, updateStaffSchema } from "@/lib/validations/staff";
import { assignableRoles, findManageableStaff } from "@/lib/staff-access";
import { getCachedBranches } from "@/lib/queries/branches";
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
  if (!assignableRoles(session.user.role).includes(data.role)) {
    return { error: "Only the owner can make someone a manager or an owner." };
  }
  if (data.branchId && !(await getCachedBranches(session.user.organizationId!)).some((b) => b.id === data.branchId)) {
    return { error: "That branch isn't part of your boutique." };
  }

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
      organizationId: session.user.organizationId,
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

  // Same boutique only, and below the owner never an owner's account.
  const target = await findManageableStaff(session.user, userId);
  if (!target) return { error: "Staff member not found." };
  if (data.role !== target.role && !assignableRoles(session.user.role).includes(data.role)) {
    return { error: "Only the owner can make someone a manager or an owner." };
  }
  if (data.branchId && !(await getCachedBranches(session.user.organizationId!)).some((b) => b.id === data.branchId)) {
    return { error: "That branch isn't part of your boutique." };
  }
  if (session.user.role !== "OWNER" && session.user.branchId && (data.branchId || null) !== target.branchId) {
    return { error: "Only the owner can move staff to another branch." };
  }

  const [existingEmail, existingCode] = await Promise.all([
    db.user.findFirst({ where: { email, id: { not: userId } } }),
    db.staffProfile.findFirst({ where: { employeeCode: data.employeeCode, userId: { not: userId } } }),
  ]);
  if (existingEmail) return { error: "Another user already uses this email." };
  if (existingCode) return { error: `Employee code ${data.employeeCode} is already in use.` };

  // Nobody can lock themselves out, or promote themselves, from their own account.
  if (userId === session.user.id && (!data.isActive || data.role !== target.role)) {
    return { error: "You can't deactivate or change the role of your own account." };
  }

  const passwordHash = data.newPassword ? await bcrypt.hash(data.newPassword, 10) : undefined;
  // A password set here, or a deactivation, ends that person's existing sessions.
  const endsSessions = Boolean(passwordHash) || (target.isActive && !data.isActive);

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
        ...(passwordHash ? { passwordHash, mustChangePassword: userId !== session.user.id } : {}),
        ...(endsSessions ? { passwordChangedAt: new Date() } : {}),
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
