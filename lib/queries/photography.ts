import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { branchScope, type ScopeUser } from "@/lib/scope";
import type { ShootFormBranch, ShootFormPhotographer, ShootFormService } from "@/components/domain/photo-shoot-form";

/** The branches, services and photographers a shoot form can offer this user. */
export async function getShootFormOptions(user: ScopeUser): Promise<{
  branches: ShootFormBranch[];
  services: ShootFormService[];
  photographers: ShootFormPhotographer[];
}> {
  const scope = await branchScope(user);
  const allowedIds = typeof scope.branchId === "string" ? [scope.branchId] : scope.branchId.in;
  const [allBranches, services, photographers] = await Promise.all([
    getCachedBranches(user.organizationId ?? ""),
    db.photoService.findMany({ where: { ...scope, isActive: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: {
        organizationId: user.organizationId ?? "",
        role: "PHOTOGRAPHER",
        isActive: true,
        OR: [{ branchId: null }, { branchId: { in: allowedIds } }],
      },
      select: { id: true, name: true, branchId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    branches: allBranches.filter((b) => allowedIds.includes(b.id)).map((b) => ({ id: b.id, name: b.name, currency: b.currency })),
    services: services.map((s) => ({
      id: s.id,
      branchId: s.branchId,
      name: s.name,
      type: s.type,
      price: Number(s.price),
      durationMinutes: s.durationMinutes,
    })),
    photographers,
  };
}
