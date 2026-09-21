"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supplierSchema, type SupplierInput } from "@/lib/validations/supplier";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SupplierForm({
  action,
  defaultValues,
  submitLabel = "Save Supplier",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<SupplierInput>;
  submitLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues,
  });

  function onSubmit(values: SupplierInput) {
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
          <Label htmlFor="name">Supplier Name</Label>
          <Input id="name" {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactName">Contact Person</Label>
          <Input id="contactName" {...form.register("contactName")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+971501234567" {...form.register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...form.register("address")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
