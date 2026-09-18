import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchForm } from "@/components/domain/branch-form";
import { createBranch } from "@/lib/actions/branch-actions";

export default async function NewBranchPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "branches", "create")) {
    redirect("/dashboard/branches");
  }
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">New Branch</h1>
        <p className="text-sm text-muted-foreground">
          Opening a new market? This is the only thing that changes — everything else already reads currency, tax and
          locale from here.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BranchForm action={createBranch} />
        </CardContent>
      </Card>
    </div>
  );
}
