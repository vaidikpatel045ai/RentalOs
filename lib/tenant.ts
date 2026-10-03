import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import type { Organization, Role } from "@prisma/client";

/** Blocks access on an explicit SUSPENDED/CANCELLED status, or a lapsed
 * MONTHLY period end — regardless of status label, since the Platform
 * Admin tracks billing manually and may not always flip status the same
 * day a period lapses. */
export function isOrganizationActive(org: Pick<Organization, "status" | "currentPeriodEnd"> | null): boolean {
  if (!org) return false;
  if (org.status === "SUSPENDED" || org.status === "CANCELLED") return false;
  if (org.currentPeriodEnd && org.currentPeriodEnd.getTime() < Date.now()) return false;
  return true;
}

export async function getOrganizationForUser(organizationId: string | null) {
  if (!organizationId) return null;
  return db.organization.findUnique({ where: { id: organizationId } });
}

/**
 * The picker/search API routes (customer, garment, staff, booking lookups
 * used by various admin forms) all need the same scoping the dashboard list
 * pages have: a non-OWNER sees their own branch; an OWNER with no explicit
 * branch picked sees every branch in *their* org, never literally every
 * branch in the table. Always returns a plain `branchId` scalar filter
 * (never a `branch: {...}` relation filter) so it's safe to spread into any
 * model's `where` that has a direct branchId field, regardless of which
 * model that is.
 */
export async function resolveBranchWhere(
  user: { role: Role; branchId: string | null; organizationId: string | null },
  explicitBranchId?: string
): Promise<{ branchId: string } | { branchId: { in: string[] } }> {
  if (user.branchId && user.role !== "OWNER") {
    return { branchId: user.branchId };
  }
  const branches = await getCachedBranches(user.organizationId ?? "");
  const allowedIds = branches.map((b) => b.id);
  if (explicitBranchId && allowedIds.includes(explicitBranchId)) {
    return { branchId: explicitBranchId };
  }
  return { branchId: { in: allowedIds } };
}
