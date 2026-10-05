"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { expenseSchema, EXPENSE_CATEGORIES, type ExpenseInput } from "@/lib/validations/expense";
import { TRANSACTION_METHODS } from "@/lib/validations/payment";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { enumLabel } from "@/lib/format-enum";

interface BranchOption {
  id: string;
  name: string;
}

export function ExpenseForm({
  branches,
  action,
  defaultValues,
  submitLabel = "Save Expense",
}: {
  branches: BranchOption[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<ExpenseInput>;
  submitLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();
  // Every Select-driven field lives in the form's own values (with a default),
  // so validation never sees it as missing.
  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      branchId: branches[0]?.id ?? "",
      paymentMethod: "CASH",
      expenseDate: format(new Date(), "yyyy-MM-dd"),
      ...defaultValues,
    },
  });
  const { errors } = form.formState;

  function onSubmit(values: ExpenseInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      fd.set(key, String(value));
    });
    startTransition(async () => {
      const result = await action({}, fd);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            defaultValue={form.getValues("category")}
            onValueChange={(v) => form.setValue("category", v as ExpenseInput["category"], { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {enumLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" min={0} step={0.01} placeholder="0.00" {...form.register("amount")} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expenseDate">Date</Label>
          <Input id="expenseDate" type="date" {...form.register("expenseDate")} />
          {errors.expenseDate && <p className="text-xs text-destructive">{errors.expenseDate.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Paid By</Label>
          <Select
            defaultValue={form.getValues("paymentMethod")}
            onValueChange={(v) => form.setValue("paymentMethod", v as ExpenseInput["paymentMethod"], { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {enumLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.paymentMethod && <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>}
        </div>

        {branches.length > 1 && (
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select
              defaultValue={form.getValues("branchId")}
              onValueChange={(v) => form.setValue("branchId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="vendor">Paid To</Label>
          <Input id="vendor" placeholder="e.g. DEWA, landlord, dry-cleaning supplier" {...form.register("vendor")} />
          {errors.vendor && <p className="text-xs text-destructive">{errors.vendor.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Notes</Label>
        <Textarea id="description" rows={3} placeholder="Optional" {...form.register("description")} />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
