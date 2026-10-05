import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationOnboardForm } from "@/components/domain/organization-onboard-form";

export default async function NewOrganizationPage() {
  const plans = await db.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Onboard a Boutique</h1>
        <p className="text-sm text-muted-foreground">Creates the organization, its first owner account, and its first branch.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationOnboardForm plans={plans.map((p) => ({ id: p.id, name: p.name }))} />
        </CardContent>
      </Card>
    </div>
  );
}
