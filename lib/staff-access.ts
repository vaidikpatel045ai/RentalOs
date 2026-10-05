import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { STAFF_ROLES } from "@/lib/validations/staff";

type Actor = { id: string; role: Role; branchId: string | null; organizationId: string | null };

/**
 * The staff account `actor` may edit or reset, or null. Same boutique only;
 * below the owner, only staff in the actor's own branch and never an owner.
 * Every staff edit/reset must go through this, never a bare findUnique by id.
 */
export async function findManageableStaff(actor: Actor, targetId: string) {
  if (!actor.organizationId) return null;
  const target = await db.user.findUnique({ where: { id: targetId }, include: { staffProfile: true } });
  if (!target || target.organizationId !== actor.organizationId) return null;
  if (target.role === "CUSTOMER" || target.role === "PLATFORM_ADMIN") return null;
  if (actor.role !== "OWNER") {
    if (target.role === "OWNER") return null;
    if (actor.branchId && target.branchId !== actor.branchId) return null;
  }
  return target;
}

/** Roles `actor` may give someone: only an owner can make owners or managers. */
export function assignableRoles(actorRole: Role): (typeof STAFF_ROLES)[number][] {
  if (actorRole === "OWNER") return [...STAFF_ROLES];
  return STAFF_ROLES.filter((r) => r !== "OWNER" && r !== "MANAGER");
}
