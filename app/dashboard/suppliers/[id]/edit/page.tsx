import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierForm } from "@/components/domain/supplier-form";
import { updateSupplier } from "@/lib/actions/supplier-actions";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "suppliers", "update")) {
    redirect("/dashboard/suppliers");
  }
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Edit {supplier.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            action={updateSupplier.bind(null, id)}
            defaultValues={{
              name: supplier.name,
              contactName: supplier.contactName ?? "",
              phone: supplier.phone ?? "",
              email: supplier.email ?? "",
              address: supplier.address ?? "",
              notes: supplier.notes ?? "",
            }}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
