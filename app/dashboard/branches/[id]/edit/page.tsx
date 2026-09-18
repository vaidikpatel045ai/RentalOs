import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchForm } from "@/components/domain/branch-form";
import { updateBranch } from "@/lib/actions/branch-actions";

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "branches", "update")) {
    redirect("/dashboard/branches");
  }
  const branch = await db.branch.findUnique({ where: { id } });
  if (!branch) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Edit {branch.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BranchForm
            action={updateBranch.bind(null, id)}
            defaultValues={{
              name: branch.name,
              code: branch.code,
              country: branch.country,
              currency: branch.currency,
              timezone: branch.timezone,
              locale: branch.locale,
              taxLabel: branch.taxLabel,
              taxRate: Number(branch.taxRate),
              city: branch.city ?? "",
              stateOrRegion: branch.stateOrRegion ?? "",
              addressLine1: branch.addressLine1 ?? "",
              phone: branch.phone ?? "",
              email: branch.email ?? "",
            }}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
