"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { packageSchema, type PackageInput } from "@/lib/validations/package";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Branch } from "@prisma/client";

export function PackageForm({
  branches,
  action,
  defaultValues,
  submitLabel = "Save Package",
}: {
  branches: Branch[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<PackageInput>;
  submitLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PackageInput>({
    resolver: zodResolver(packageSchema),
    defaultValues: { branchId: branches[0]?.id ?? "", ...defaultValues },
  });

  function onSubmit(values: PackageInput) {
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
          <Label htmlFor="name">Package Name</Label>
          <Input id="name" placeholder="Complete Bridal Package" {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price</Label>
          <Input id="price" type="number" min={0} step={0.01} {...form.register("price")} />
          {form.formState.errors.price && <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Branch</Label>
          <Select defaultValue={form.getValues("branchId")} onValueChange={(v) => form.setValue("branchId", v)}>
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
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...form.register("description")} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
