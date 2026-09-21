import { db } from "@/lib/db";

interface NotifyParams {
  type: string;
  title: string;
  body?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/** Fire-and-record an in-app notification for one user. Action-triggered
 * only — there's no background job runner in this app yet, so nothing here
 * fires on the passage of time (e.g. "payment overdue"), only in direct
 * response to another action (a job being assigned, a charge being raised). */
export async function notifyUser(userId: string, params: NotifyParams) {
  await db.notification.create({ data: { userId, ...params } });
}

export async function notifyUsers(userIds: string[], params: NotifyParams) {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  await db.notification.createMany({ data: unique.map((userId) => ({ userId, ...params })) });
}
