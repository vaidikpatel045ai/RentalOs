import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffForm } from "@/components/domain/staff-form";
import { createStaff } from "@/lib/actions/staff-actions";
import { assignableRoles } from "@/lib/staff-access";
import { isPhotographyEnabled } from "@/lib/photography";

export default async function NewStaffPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff", "create")) {
    redirect("/dashboard/staff");
  }
  const [branches, photography] = await Promise.all([
    getCachedBranches(session!.user.organizationId!),
    isPhotographyEnabled(session!.user.organizationId),
  ]);
  const roles = assignableRoles(session!.user.role, { photography });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Add Staff Member</h1>
        <p className="text-sm text-muted-foreground">Create a login for a new team member.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffForm branches={branches} action={createStaff} mode="create" roles={roles} />
        </CardContent>
      </Card>
    </div>
  );
}
