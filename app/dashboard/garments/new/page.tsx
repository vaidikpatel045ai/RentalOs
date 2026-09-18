import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GarmentForm } from "@/components/domain/garment-form";
import { createGarment } from "@/lib/actions/garment-actions";

export default async function NewGarmentPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "garments", "create")) {
    redirect("/dashboard/garments");
  }
  const branches = await getCachedBranches();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Add Garment</h1>
        <p className="text-sm text-muted-foreground">Add a new item to inventory.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <GarmentForm branches={branches} defaultBranchId={session?.user.branchId ?? undefined} action={createGarment} />
        </CardContent>
      </Card>
    </div>
  );
}
