import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveBranchWhere } from "@/lib/tenant";
import { getCachedBranches } from "@/lib/queries/branches";

/**
 * Server-side reach checks for every action that takes a record id (or a
 * branch, customer, staff... id) from the browser. The list pages already
 * only show records in the user's branches; these make the actions enforce
 * the same rule, so a hand-crafted request can't touch another boutique's
 * data, or another branch's for a branch-bound manager.
 *
 * Same rule as reads (resolveBranchWhere): an OWNER reaches every branch in
 * their organization; everyone else their own branch, or every branch in
 * their organization if they have none set. Each helper returns the record
 * (a small selection) or null, so callers can 404 with their own wording.
 */

export interface ScopeUser {
  id: string;
  role: Role;
  branchId: string | null;
  organizationId: string | null;
}

/** Field workers act on what's assigned to them rather than on a branch. */
const WORKER_ROLES: Role[] = ["TAILOR", "CLEANER", "DELIVERY"];

export async function branchScope(user: ScopeUser) {
  return resolveBranchWhere(user);
}

export async function canUseBranch(user: ScopeUser, branchId: string | null | undefined): Promise<boolean> {
  if (!branchId) return false;
  const scope = await resolveBranchWhere(user);
  return typeof scope.branchId === "string" ? scope.branchId === branchId : scope.branchId.in.includes(branchId);
}

/** Any branch of the user's organization, e.g. a transfer's destination. */
export async function isOrganizationBranch(user: ScopeUser, branchId: string | null | undefined): Promise<boolean> {
  if (!branchId || !user.organizationId) return false;
  const branches = await getCachedBranches(user.organizationId);
  return branches.some((b) => b.id === branchId);
}

export async function reachGarment(user: ScopeUser, id: string) {
  return db.garment.findFirst({ where: { id, ...(await branchScope(user)) }, select: { id: true, branchId: true } });
}

export async function reachCustomer(user: ScopeUser, id: string) {
  return db.customer.findFirst({ where: { id, ...(await branchScope(user)) }, select: { id: true, branchId: true } });
}

export async function reachBooking(user: ScopeUser, id: string) {
  return db.booking.findFirst({ where: { id, ...(await branchScope(user)) }, select: { id: true, branchId: true } });
}

export async function reachPackage(user: ScopeUser, id: string) {
  return db.package.findFirst({ where: { id, ...(await branchScope(user)) }, select: { id: true, branchId: true } });
}

export async function reachExpense(user: ScopeUser, id: string) {
  return db.expense.findFirst({ where: { id, ...(await branchScope(user)) }, select: { id: true, branchId: true } });
}

export async function reachDeposit(user: ScopeUser, id: string) {
  return db.deposit.findFirst({ where: { id, booking: await branchScope(user) }, select: { id: true } });
}

export async function reachDamageCharge(user: ScopeUser, id: string) {
  return db.damageCharge.findFirst({ where: { id, booking: await branchScope(user) }, select: { id: true } });
}

export async function reachRepair(user: ScopeUser, id: string) {
  return db.garmentRepair.findFirst({ where: { id, garment: await branchScope(user) }, select: { id: true } });
}

export async function reachTransfer(user: ScopeUser, id: string) {
  const { branchId } = await branchScope(user);
  return db.inventoryTransfer.findFirst({
    where: { id, OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] },
    select: { id: true, fromBranchId: true, toBranchId: true },
  });
}

export async function reachDocument(user: ScopeUser, id: string) {
  const doc = await db.document.findUnique({
    where: { id },
    select: { id: true, customerId: true, garmentId: true, bookingId: true },
  });
  if (!doc) return null;
  // A document hangs off a customer, garment or booking; it's reachable if
  // every record it's linked to is (and it's linked to at least one).
  const checks = [
    doc.customerId ? reachCustomer(user, doc.customerId) : null,
    doc.garmentId ? reachGarment(user, doc.garmentId) : null,
    doc.bookingId ? reachBooking(user, doc.bookingId) : null,
  ].filter((c) => c !== null);
  if (checks.length === 0) return null;
  const results = await Promise.all(checks);
  return results.every(Boolean) ? { id: doc.id } : null;
}

/** Workers reach only jobs assigned to them; back office reaches jobs on its branches' garments. */
export async function reachTailoringJob(user: ScopeUser, id: string) {
  const where = WORKER_ROLES.includes(user.role)
    ? { id, assignedToUserId: user.id }
    : { id, garment: await branchScope(user) };
  return db.tailoringJob.findFirst({ where, select: { id: true } });
}

export async function reachCleaningJob(user: ScopeUser, id: string) {
  const where = WORKER_ROLES.includes(user.role)
    ? { id, assignedToUserId: user.id }
    : { id, garment: await branchScope(user) };
  return db.garmentCleaningJob.findFirst({ where, select: { id: true } });
}

export async function reachDeliveryJob(user: ScopeUser, id: string) {
  const where = WORKER_ROLES.includes(user.role)
    ? { id, assignedDriverId: user.id }
    : { id, booking: await branchScope(user) };
  return db.deliveryJob.findFirst({ where, select: { id: true } });
}

/**
 * A staff member this user may manage: same organization, never a Platform
 * Admin, and for anyone but the owner, on a branch they reach.
 */
export async function reachStaff(user: ScopeUser, id: string) {
  if (!user.organizationId) return null;
  const staff = await db.user.findFirst({
    where: { id, organizationId: user.organizationId, role: { not: "PLATFORM_ADMIN" } },
    select: { id: true, role: true, branchId: true },
  });
  if (!staff) return null;
  if (user.role === "OWNER") return staff;
  if (!staff.branchId) return null;
  return (await canUseBranch(user, staff.branchId)) ? staff : null;
}

/** Someone a job, booking or appointment can be assigned to: an active colleague in the same organization. */
export async function reachAssignee(user: ScopeUser, id: string | null | undefined, roles?: Role[]) {
  if (!id || !user.organizationId) return null;
  return db.user.findFirst({
    where: { id, organizationId: user.organizationId, isActive: true, ...(roles ? { role: { in: roles } } : {}) },
    select: { id: true },
  });
}

export async function reachSupplier(user: ScopeUser, id: string) {
  if (!user.organizationId) return null;
  return db.supplier.findFirst({ where: { id, organizationId: user.organizationId }, select: { id: true } });
}
