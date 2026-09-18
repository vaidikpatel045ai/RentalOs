import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TailoringJobForm } from "@/components/domain/tailoring-job-form";

export default async function NewTailoringJobPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "tailoring", "create")) {
    redirect("/dashboard/tailoring");
  }
  const branches = await getCachedBranches();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Assign Tailoring Job</h1>
        <p className="text-sm text-muted-foreground">Send a garment for alteration and assign a tailor.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TailoringJobForm branches={branches} defaultBranchId={session?.user.branchId ?? undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
