import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCachedBranches } from "@/lib/queries/branches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseForm } from "@/components/domain/expense-form";
import { createExpense } from "@/lib/actions/expense-actions";

export default async function NewExpensePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "expenses", "create")) {
    redirect("/dashboard/expenses");
  }
  const allBranches = await getCachedBranches(session.user.organizationId!);
  // Staff tied to a branch can only record against that branch.
  const branches =
    session.user.role === "OWNER" ? allBranches : allBranches.filter((b) => b.id === session.user.branchId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Add Expense</h1>
        <p className="text-sm text-muted-foreground">Record money that went out of the boutique.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm branches={branches.map((b) => ({ id: b.id, name: b.name }))} action={createExpense} />
        </CardContent>
      </Card>
    </div>
  );
}
