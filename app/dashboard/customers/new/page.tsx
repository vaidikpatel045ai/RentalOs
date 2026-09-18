import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerForm } from "@/components/domain/customer-form";
import { createCustomer } from "@/lib/actions/customer-actions";

export default async function NewCustomerPage() {
  const session = await auth();
  const branches = await getCachedBranches();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">New Customer</h1>
        <p className="text-sm text-muted-foreground">Create a bride/customer profile.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm branches={branches} defaultBranchId={session?.user.branchId ?? undefined} action={createCustomer} />
        </CardContent>
      </Card>
    </div>
  );
}
