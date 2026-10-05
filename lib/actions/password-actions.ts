"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, homeRouteForRole } from "@/lib/permissions";
import { findManageableStaff } from "@/lib/staff-access";
import { escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { trustedAppUrl } from "@/lib/app-url";
import { findUsableResetToken } from "@/lib/password-reset";
import type { Role } from "@prisma/client";
import {
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  generateTemporaryPassword,
  hashPassword,
  newPasswordSchema,
} from "@/lib/passwords";

export type PasswordFormState = { error?: string; fieldErrors?: Record<string, string[] | undefined>; message?: string };

export type TemporaryPasswordResult =
  | { ok: true; name: string; email: string; phone: string | null; temporaryPassword: string; loginUrl: string | null }
  | { ok: false; error: string };

/** Sets a new password hash. `temporary` means someone else chose it, so the
 * user must replace it at next sign-in. Either way, every existing session
 * for the account ends (see lib/session-guard.ts) and open reset links die. */
async function setPassword(userId: string, password: string, temporary: boolean) {
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(password), mustChangePassword: temporary, passwordChangedAt: new Date() },
    }),
    db.passwordResetToken.deleteMany({ where: { userId } }),
  ]);
}

async function audit(actor: { id: string; role: Role } | null, action: string, target: { id: string; name: string }) {
  await db.auditLog.create({
    data: {
      userId: actor?.id ?? null,
      userRole: actor?.role ?? null,
      action,
      entityType: "User",
      entityId: target.id,
      newValue: { name: target.name },
    },
  });
}

async function issueTemporaryPassword(
  actor: { id: string; role: Role },
  target: { id: string; name: string; email: string; phone: string | null },
  action: string
): Promise<TemporaryPasswordResult> {
  const temporaryPassword = generateTemporaryPassword();
  await setPassword(target.id, temporaryPassword, true);
  await audit(actor, action, target);
  const base = trustedAppUrl();
  return {
    ok: true,
    name: target.name,
    email: target.email,
    phone: target.phone,
    temporaryPassword,
    loginUrl: base ? `${base}/login` : null,
  };
}

/** Owner or manager resets a staff member's password to a one-time temporary one. */
export async function resetStaffPassword(userId: string): Promise<TemporaryPasswordResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  if (!can(session.user.role, "staff", "update")) return { ok: false, error: "You don't have permission to reset passwords." };
  if (userId === session.user.id) return { ok: false, error: "To change your own password, use Change password in your account menu." };

  const target = await findManageableStaff(session.user, userId);
  if (!target) return { ok: false, error: "Staff member not found." };

  const result = await issueTemporaryPassword(session.user, target, "PASSWORD_RESET_BY_STAFF");
  revalidatePath("/dashboard/staff");
  return result;
}

/** Owner or manager resets a customer's portal password (managers: their own branch's customers). */
export async function resetCustomerPassword(customerId: string): Promise<TemporaryPasswordResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
    return { ok: false, error: "Only the owner or a manager can reset a customer's password." };
  }

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: { branch: { select: { organizationId: true } }, user: true },
  });
  const inScope =
    customer &&
    customer.branch.organizationId === session.user.organizationId &&
    (session.user.role === "OWNER" || !session.user.branchId || customer.branchId === session.user.branchId);
  if (!customer || !inScope) return { ok: false, error: "Customer not found." };
  if (!customer.user || customer.user.role !== "CUSTOMER") {
    return { ok: false, error: "This customer doesn't have a portal login." };
  }

  const result = await issueTemporaryPassword(
    session.user,
    { ...customer.user, phone: customer.whatsapp || customer.phone },
    "PASSWORD_RESET_CUSTOMER"
  );
  revalidatePath(`/dashboard/customers/${customerId}`);
  return result;
}

/** Platform Admin resets a boutique owner's password (the owner has nobody above them in the boutique). */
export async function resetOwnerPassword(userId: string): Promise<TemporaryPasswordResult> {
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") return { ok: false, error: "Not allowed." };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "OWNER") return { ok: false, error: "Owner not found." };

  const result = await issueTemporaryPassword(session.user, target, "PASSWORD_RESET_BY_PLATFORM_ADMIN");
  if (target.organizationId) revalidatePath(`/admin/organizations/${target.organizationId}`);
  return result;
}

/** Signed-in user changes their own password (also the forced step after a reset). */
export async function changeOwnPassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Your session has ended. Please sign in again." };

  const current = String(formData.get("currentPassword") ?? "");
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.isActive) return { error: "Your account isn't active." };
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Your current password is incorrect.", fieldErrors: { currentPassword: ["Incorrect password"] } };
  }
  if (await bcrypt.compare(parsed.data.password, user.passwordHash)) {
    return { error: "Choose a password different from your current one.", fieldErrors: { password: ["Same as current password"] } };
  }

  await setPassword(user.id, parsed.data.password, false);
  await audit(session.user, "PASSWORD_CHANGED", user);

  // Sign straight back in with the new password: the fresh session starts
  // after passwordChangedAt, so it isn't caught by the session check, while
  // every other device is signed out.
  await signIn("credentials", { email: user.email, password: parsed.data.password, redirectTo: homeRouteForRole(user.role) });
  return {};
}

/** "Forgot password?": emails a one-hour, single-use link. Always answers the
 * same way whether or not the email exists, so it can't be used to find accounts. */
export async function requestPasswordReset(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email || !email.includes("@")) return { error: "Enter the email you sign in with." };

  const base = trustedAppUrl();
  if (!isEmailConfigured() || !base) {
    return {
      error:
        "Password reset by email isn't available yet. Ask your manager or the boutique owner to reset your password from the Staff page.",
    };
  }

  const done: PasswordFormState = {
    message: "If an account exists for that email, a reset link is on its way. It expires in 1 hour.",
  };

  const user = await db.user.findUnique({ where: { email }, include: { organization: { select: { name: true } } } });
  if (!user || !user.isActive) return done;

  // At most 3 links an hour per account, so this can't be used to flood an inbox.
  const recent = await db.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - RESET_TOKEN_TTL_MS) } },
  });
  if (recent >= 3) return done;

  const { token, tokenHash } = generateResetToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const link = `${base}/reset-password?token=${token}`;
  const sender = user.organization?.name ?? "Bridal Rental OS";
  const text = [
    `Hi ${user.name.split(" ")[0]},`,
    "",
    "We received a request to reset your password. Use this link to choose a new one:",
    link,
    "",
    "The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email; your password won't change.",
    "",
    sender,
  ].join("\n");
  const html = `<p>Hi ${escapeHtml(user.name.split(" ")[0])},</p>
<p>We received a request to reset your password. Use the button below to choose a new one.</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#1f1a17;color:#fff;border-radius:6px;text-decoration:none">Reset password</a></p>
<p style="color:#6f665e;font-size:13px">The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email; your password won't change.</p>
<p>${escapeHtml(sender)}</p>`;

  const sent = await sendEmail({ to: user.email, subject: "Reset your password", text, html, fromName: sender });
  if (!sent.ok) return { error: "We couldn't send the email just now. Please try again in a few minutes." };
  return done;
}

/** Sets the new password from a reset link, then sends the user to sign in. */
export async function resetPasswordWithToken(token: string, _prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };

  const row = await findUsableResetToken(token);
  if (!row) return { error: "This reset link has expired or was already used. Request a new one." };

  // Claim the token first so the same link can't be used twice at once.
  const claimed = await db.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count === 0) return { error: "This reset link was already used. Request a new one." };

  await setPassword(row.userId, parsed.data.password, false);
  await audit(null, "PASSWORD_RESET_BY_EMAIL", row.user);
  redirect("/login?reset=1");
}
