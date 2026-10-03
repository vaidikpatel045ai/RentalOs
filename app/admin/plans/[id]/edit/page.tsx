import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanForm } from "@/components/domain/plan-form";
import { updatePlan } from "@/lib/actions/plan-actions";

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await db.plan.findUnique({ where: { id } });
  if (!plan) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Edit {plan.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanForm
            action={updatePlan.bind(null, id)}
            defaultValues={{
              name: plan.name,
              billingInterval: plan.billingInterval,
              price: Number(plan.price),
              currency: plan.currency,
              maxBranches: plan.maxBranches ?? undefined,
            }}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
