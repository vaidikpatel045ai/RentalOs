import { db } from "@/lib/db";
import type { ScopeUser } from "@/lib/scope";
import { branchScope } from "@/lib/scope";

/**
 * The photography module is optional: not every boutique offers shoots, so
 * it stays hidden until the platform admin switches it on for a boutique
 * (Organization.photographyEnabled). Every photography page, action and
 * query checks this on the server; hiding the nav link alone is not enough.
 */
export async function isPhotographyEnabled(organizationId: string | null | undefined): Promise<boolean> {
  if (!organizationId) return false;
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { photographyEnabled: true } });
  return Boolean(org?.photographyEnabled);
}

export const PHOTOGRAPHY_OFF_MESSAGE = "Photography services aren't switched on for this boutique.";

/** Photographers reach the shoots assigned to them; back office reaches shoots on its branches. */
export async function reachPhotoShoot(user: ScopeUser, id: string) {
  const where =
    user.role === "PHOTOGRAPHER"
      ? { id, photographerId: user.id }
      : user.role === "CUSTOMER"
        ? { id, customer: { userId: user.id } }
        : { id, ...(await branchScope(user)) };
  return db.photoShoot.findFirst({ where, select: { id: true, branchId: true, customerId: true } });
}

export async function reachPhotoService(user: ScopeUser, id: string) {
  return db.photoService.findFirst({ where: { id, ...(await branchScope(user)) }, select: { id: true, branchId: true } });
}

/** An active photographer in the same boutique, on the shoot's branch or with no branch set. */
export async function reachPhotographer(user: ScopeUser, id: string, branchId: string) {
  if (!user.organizationId) return null;
  return db.user.findFirst({
    where: {
      id,
      role: "PHOTOGRAPHER",
      isActive: true,
      organizationId: user.organizationId,
      OR: [{ branchId }, { branchId: null }],
    },
    select: { id: true },
  });
}

/** Numeric-max based, like booking numbers, so cancelled shoots never cause a collision. */
export async function nextShootNumber(): Promise<string> {
  const prefix = `PS-${new Date().getFullYear()}-`;
  const existing = await db.photoShoot.findMany({
    where: { shootNumber: { startsWith: prefix } },
    select: { shootNumber: true },
  });
  const max = existing.reduce((m, { shootNumber }) => {
    const n = parseInt(shootNumber.slice(prefix.length), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

/** What a shoot still costs the client. */
export function shootBalance(shoot: { price: unknown; discount: unknown; paidAmount: unknown }): number {
  const total = Math.max(0, Number(shoot.price) - Number(shoot.discount));
  return Math.max(0, Math.round((total - Number(shoot.paidAmount)) * 100) / 100);
}
