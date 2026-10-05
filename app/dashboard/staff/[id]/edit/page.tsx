import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffForm } from "@/components/domain/staff-form";
import { updateStaff } from "@/lib/actions/staff-actions";
import type { STAFF_ROLES } from "@/lib/validations/staff";
import { assignableRoles, findManageableStaff } from "@/lib/staff-access";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff", "update")) {
    redirect("/dashboard/staff");
  }

  const [user, branches] = await Promise.all([
    // Another boutique's staff, or (for a manager) another branch's or the owner, looks like a missing page.
    findManageableStaff(session!.user, id),
    getCachedBranches(session!.user.organizationId!),
  ]);
  if (!user) notFound();
  const role = user.role as (typeof STAFF_ROLES)[number];
  const allowed = assignableRoles(session!.user.role);
  const roles = allowed.includes(role) ? allowed : [role, ...allowed];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Edit {user.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffForm
            branches={branches}
            action={updateStaff.bind(null, id)}
            mode="edit"
            roles={roles}
            defaultValues={{
              name: user.name,
              email: user.email,
              role,
              branchId: user.branchId,
              phone: user.phone ?? "",
              employeeCode: user.staffProfile?.employeeCode ?? "",
              title: user.staffProfile?.title ?? "",
              department: user.staffProfile?.department ?? "",
              isActive: user.isActive,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
