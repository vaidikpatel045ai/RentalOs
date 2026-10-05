import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getCachedBranches } from "@/lib/queries/branches";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageForm } from "@/components/domain/package-form";
import { PackageItemsManager } from "@/components/domain/package-items-manager";
import { updatePackage } from "@/lib/actions/package-actions";

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "packages", "update")) {
    redirect("/dashboard/packages");
  }
  const [pkg, allBranches] = await Promise.all([
    db.package.findUnique({ where: { id }, include: { items: { orderBy: { id: "asc" } } } }),
    getCachedBranches(session.user.organizationId!),
  ]);
  const branches =
    session.user.role === "OWNER" ? allBranches : allBranches.filter((b) => b.id === session.user.branchId);
  // Another boutique's (or another branch's) package looks exactly like a missing one.
  if (!pkg || !branches.some((b) => b.id === pkg.branchId)) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl">Edit {pkg.name}</h1>
          {pkg.isDraft && <Badge variant="secondary">Draft</Badge>}
        </div>
        {pkg.isDraft && (
          <p className="text-sm text-muted-foreground">This package is a draft. Publish it when it&apos;s ready to offer.</p>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PackageForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            action={updatePackage.bind(null, id)}
            status={pkg.isDraft ? "draft" : "published"}
            defaultValues={{
              branchId: pkg.branchId,
              name: pkg.name,
              description: pkg.description ?? "",
              price: pkg.price === null ? "" : Number(pkg.price),
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <PackageItemsManager packageId={pkg.id} items={pkg.items} />
        </CardContent>
      </Card>
    </div>
  );
}
