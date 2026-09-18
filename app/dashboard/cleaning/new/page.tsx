import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CleaningJobForm } from "@/components/domain/cleaning-job-form";

export default async function NewCleaningJobPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "cleaning", "create")) {
    redirect("/dashboard/cleaning");
  }
  const branches = await getCachedBranches();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Create Cleaning Job</h1>
        <p className="text-sm text-muted-foreground">Send a garment to the cleaning team.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CleaningJobForm branches={branches} defaultBranchId={session?.user.branchId ?? undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
