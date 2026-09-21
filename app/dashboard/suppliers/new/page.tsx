import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierForm } from "@/components/domain/supplier-form";
import { createSupplier } from "@/lib/actions/supplier-actions";

export default async function NewSupplierPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "suppliers", "create")) {
    redirect("/dashboard/suppliers");
  }
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Add Supplier</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm action={createSupplier} />
        </CardContent>
      </Card>
    </div>
  );
}
