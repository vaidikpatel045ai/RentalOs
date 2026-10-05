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
  const allBranches = await getCachedBranches(session.user.organizationId!);
  // Managers create packages for their own branch only.
  const branches =
    session.user.role === "OWNER" ? allBranches : allBranches.filter((b) => b.id === session.user.branchId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">New Package</h1>
        <p className="text-sm text-muted-foreground">
          Not ready yet? Save it as a draft and finish it later. Add items to the package after saving.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PackageForm branches={branches.map((b) => ({ id: b.id, name: b.name }))} action={createPackage} />
        </CardContent>
      </Card>
    </div>
  );
}
