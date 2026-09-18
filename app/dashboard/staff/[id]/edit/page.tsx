import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffForm } from "@/components/domain/staff-form";
import { updateStaff } from "@/lib/actions/staff-actions";
import type { STAFF_ROLES } from "@/lib/validations/staff";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff", "update")) {
    redirect("/dashboard/staff");
  }

  const [user, branches] = await Promise.all([
    db.user.findUnique({ where: { id }, include: { staffProfile: true } }),
    getCachedBranches(),
  ]);
  if (!user || user.role === "CUSTOMER") notFound();

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
            defaultValues={{
              name: user.name,
              email: user.email,
              role: user.role as (typeof STAFF_ROLES)[number],
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
