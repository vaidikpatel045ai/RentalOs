import { db } from "@/lib/db";
import { hashResetToken } from "@/lib/passwords";

/** Looks up a reset token that can still be used. */
export async function findUsableResetToken(token: string) {
  if (!token || token.length > 200) return null;
  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date() || !row.user.isActive) return null;
  return row;
}
