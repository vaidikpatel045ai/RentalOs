import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getCachedBranches } from "@/lib/queries/branches";
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
  const [pkg, branches] = await Promise.all([
    db.package.findUnique({ where: { id }, include: { items: { orderBy: { id: "asc" } } } }),
    getCachedBranches(),
  ]);
  if (!pkg) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Edit {pkg.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PackageForm
            branches={branches}
            action={updatePackage.bind(null, id)}
            defaultValues={{
              branchId: pkg.branchId,
              name: pkg.name,
              description: pkg.description ?? "",
              price: Number(pkg.price),
            }}
            submitLabel="Save Changes"
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
