import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { db } from "@/lib/db";

/**
 * Sessions are JWTs, so they can't be revoked directly. Each layout calls
 * this instead: a session ends when the account is deactivated or its
 * password was changed/reset after this sign-in, and a user given a
 * temporary password is sent to choose their own before anything else.
 */
export async function enforceSessionValidity(session: Session) {
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true, passwordChangedAt: true, mustChangePassword: true },
  });
  const signedInAt = session.user.signedInAt ?? 0;
  if (!user || !user.isActive || (user.passwordChangedAt && user.passwordChangedAt.getTime() > signedInAt)) {
    redirect("/session-ended");
  }
  if (user.mustChangePassword) redirect("/change-password");
}
