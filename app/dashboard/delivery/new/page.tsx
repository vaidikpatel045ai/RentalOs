import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliveryJobForm } from "@/components/domain/delivery-job-form";

export default async function NewDeliveryJobPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "delivery", "create")) {
    redirect("/dashboard/delivery");
  }
  const branches = await getCachedBranches();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Create Delivery Job</h1>
        <p className="text-sm text-muted-foreground">Assign a driver for pickup, delivery or return.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryJobForm branches={branches} defaultBranchId={session?.user.branchId ?? undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
