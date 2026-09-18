import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerForm } from "@/components/domain/customer-form";
import { updateCustomer } from "@/lib/actions/customer-actions";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, branches] = await Promise.all([
    db.customer.findUnique({ where: { id } }),
    getCachedBranches(),
  ]);
  if (!customer) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">
          Edit {customer.firstName} {customer.lastName}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            branches={branches}
            action={updateCustomer.bind(null, id)}
            defaultValues={{
              branchId: customer.branchId,
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              whatsapp: customer.whatsapp ?? "",
              email: customer.email ?? "",
              nationality: customer.nationality ?? "",
              preferredLanguage: customer.preferredLanguage,
              weddingDate: customer.weddingDate,
              weddingVenue: customer.weddingVenue ?? "",
              eventType: customer.eventType ?? "",
              favoriteDesigners: customer.favoriteDesigners,
              stylePreferences: customer.stylePreferences ?? "",
              notes: customer.notes ?? "",
            }}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
