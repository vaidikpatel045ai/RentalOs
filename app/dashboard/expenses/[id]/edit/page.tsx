import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getCachedBranches } from "@/lib/queries/branches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseForm } from "@/components/domain/expense-form";
import { updateExpense } from "@/lib/actions/expense-actions";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "expenses", "update")) {
    redirect("/dashboard/expenses");
  }
  const [expense, allBranches] = await Promise.all([
    db.expense.findUnique({ where: { id } }),
    getCachedBranches(session.user.organizationId!),
  ]);
  const isOwner = session.user.role === "OWNER";
  const branches = isOwner ? allBranches : allBranches.filter((b) => b.id === session.user.branchId);
  // Another boutique's (or another branch's) expense looks exactly like a missing one.
  if (!expense || !branches.some((b) => b.id === expense.branchId)) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Edit Expense</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            action={updateExpense.bind(null, id)}
            defaultValues={{
              branchId: expense.branchId,
              category: expense.category,
              amount: Number(expense.amount),
              expenseDate: format(expense.expenseDate, "yyyy-MM-dd"),
              paymentMethod: expense.paymentMethod,
              vendor: expense.vendor ?? "",
              description: expense.description ?? "",
            }}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
