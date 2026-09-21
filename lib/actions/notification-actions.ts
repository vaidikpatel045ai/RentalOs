"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** No RBAC resource needed — every action is scoped to the caller's own
 * notifications via the userId filter, so any authenticated user may act on
 * their own rows regardless of role. Callers refresh via router.refresh()
 * (the bell lives in the shared dashboard layout, not one specific route). */
export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  await db.notification.updateMany({ where: { id, userId: session.user.id }, data: { isRead: true } });
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  await db.notification.updateMany({ where: { userId: session.user.id, isRead: false }, data: { isRead: true } });
}
