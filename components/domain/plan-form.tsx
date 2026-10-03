"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { planSchema, BILLING_INTERVALS, type PlanInput } from "@/lib/validations/plan";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { enumLabel } from "@/lib/format-enum";

export function PlanForm({
  action,
  defaultValues,
  submitLabel = "Save Plan",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<PlanInput>;
  submitLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [billingInterval, setBillingInterval] = useState(defaultValues?.billingInterval ?? "MONTHLY");
  const form = useForm<PlanInput>({
    resolver: zodResolver(planSchema),
    defaultValues: { currency: "AED", ...defaultValues },
  });

  function onSubmit(values: PlanInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      fd.set(key, String(value));
    });
    fd.set("billingInterval", billingInterval);
    startTransition(async () => {
      const result = await action({}, fd);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Plan Name</Label>
          <Input id="name" placeholder="Growth Monthly" {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Billing</Label>
          <Select value={billingInterval} onValueChange={(v) => setBillingInterval(v as typeof billingInterval)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILLING_INTERVALS.map((b) => (
                <SelectItem key={b} value={b}>
                  {enumLabel(b)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price</Label>
          <Input id="price" type="number" min={0} step={0.01} {...form.register("price")} />
          {form.formState.errors.price && <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" {...form.register("currency")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxBranches">Max Branches</Label>
          <Input id="maxBranches" type="number" min={1} placeholder="Leave blank for unlimited" {...form.register("maxBranches")} />
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
