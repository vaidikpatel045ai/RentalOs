import { db } from "@/lib/db";

/**
 * Deliberately uncached — notifications must always read fresh (a stale
 * unread badge is worse than a slightly slower topbar), and the query
 * itself is cheap (indexed on [userId, isRead]).
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, isRead: false } });
}

export async function getRecentNotifications(userId: string, limit = 10) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
}
