"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { branchSchema, type BranchInput } from "@/lib/validations/branch";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BranchForm({
  action,
  defaultValues,
  submitLabel = "Save Branch",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<BranchInput>;
  submitLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<BranchInput>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      country: "AE",
      currency: "AED",
      timezone: "Asia/Dubai",
      locale: "en-AE",
      taxLabel: "VAT",
      taxRate: 5,
      ...defaultValues,
    },
  });

  function onSubmit(values: BranchInput) {
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
          <Label htmlFor="name">Branch Name</Label>
          <Input id="name" placeholder="Bridal Rental OS — Dubai" {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" placeholder="DXB" {...form.register("code")} />
          {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">Country (ISO-2)</Label>
          <Input id="country" placeholder="AE" {...form.register("country")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency (ISO-3)</Label>
          <Input id="currency" placeholder="AED" {...form.register("currency")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" placeholder="Asia/Dubai" {...form.register("timezone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="locale">Locale</Label>
          <Input id="locale" placeholder="en-AE" {...form.register("locale")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taxLabel">Tax Label</Label>
          <Input id="taxLabel" placeholder="VAT" {...form.register("taxLabel")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taxRate">Tax Rate (%)</Label>
          <Input id="taxRate" type="number" step="0.1" {...form.register("taxRate")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...form.register("city")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stateOrRegion">State / Region</Label>
          <Input id="stateOrRegion" {...form.register("stateOrRegion")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addressLine1">Address</Label>
          <Input id="addressLine1" {...form.register("addressLine1")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+97144001234" {...form.register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
