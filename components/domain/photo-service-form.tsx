"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { photoServiceSchema, PHOTO_SHOOT_TYPES, type PhotoServiceInput } from "@/lib/validations/photography";
import { enumLabel } from "@/lib/format-enum";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PhotoServiceForm({
  branches,
  action,
  defaultValues,
  submitLabel = "Add service",
}: {
  branches: { id: string; name: string; currency: string }[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<PhotoServiceInput>;
  submitLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PhotoServiceInput>({
    resolver: zodResolver(photoServiceSchema),
    defaultValues: { branchId: branches[0]?.id ?? "", type: "PRE_WEDDING", durationMinutes: 120, ...defaultValues },
  });
  const { errors } = form.formState;
  const branchId = useWatch({ control: form.control, name: "branchId" });
  const type = useWatch({ control: form.control, name: "type" });
  const currency = branches.find((b) => b.id === branchId)?.currency ?? "AED";

  function onSubmit(values: PhotoServiceInput) {
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Pre-wedding shoot, 3 hours" {...form.register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        {branches.length > 1 && (
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={(v) => form.setValue("branchId", v)}>
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
        )}
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => form.setValue("type", v as PhotoServiceInput["type"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHOTO_SHOOT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {enumLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price ({currency})</Label>
          <Input id="price" type="number" min={0} step="0.01" {...form.register("price")} />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input id="durationMinutes" type="number" min={15} step={15} {...form.register("durationMinutes")} />
          {errors.durationMinutes && <p className="text-xs text-destructive">{errors.durationMinutes.message}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="deliverables">What&apos;s included</Label>
          <Input id="deliverables" placeholder="60 edited photos, 1-minute highlight film" {...form.register("deliverables")} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} placeholder="Shown to clients when they request a shoot in their portal." {...form.register("description")} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
