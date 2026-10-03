import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanForm } from "@/components/domain/plan-form";
import { createPlan } from "@/lib/actions/plan-actions";

export default function NewPlanPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">New Plan</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanForm action={createPlan} />
        </CardContent>
      </Card>
    </div>
  );
}
