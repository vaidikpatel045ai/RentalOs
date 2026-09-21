import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCachedBranches } from "@/lib/queries/branches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageForm } from "@/components/domain/package-form";
import { createPackage } from "@/lib/actions/package-actions";

export default async function NewPackagePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "packages", "create")) {
    redirect("/dashboard/packages");
  }
  const branches = await getCachedBranches();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">New Package</h1>
        <p className="text-sm text-muted-foreground">Add items to this package after saving.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PackageForm branches={branches} action={createPackage} />
        </CardContent>
      </Card>
    </div>
  );
}
