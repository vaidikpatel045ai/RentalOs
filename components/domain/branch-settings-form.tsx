"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { branchSettingsSchema, type BranchSettingsInput } from "@/lib/validations/branch";
import { updateBranchSettings } from "@/lib/actions/branch-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BranchSettingsForm({ defaultValues }: { defaultValues: BranchSettingsInput }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<BranchSettingsInput>({
    resolver: zodResolver(branchSettingsSchema),
    defaultValues,
    // Remount with fresh defaults whenever the selected branch changes.
  });

  function onSubmit(values: BranchSettingsInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => fd.set(key, String(value)));
    startTransition(async () => {
      const result = await updateBranchSettings({}, fd);
      if (result?.error) toast.error(result.error);
      else toast.success("Settings saved");
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...form.register("branchId")} />

      <div>
        <p className="mb-1 text-sm font-medium">Availability Engine Buffers</p>
        <p className="mb-3 text-xs text-muted-foreground">
          These hours drive the SAFE / TIGHT / UNSAFE turnaround check on every booking.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="inspectionBufferHours">Inspection Buffer (hrs)</Label>
            <Input id="inspectionBufferHours" type="number" {...form.register("inspectionBufferHours")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cleaningBufferHours">Cleaning Buffer (hrs)</Label>
            <Input id="cleaningBufferHours" type="number" {...form.register("cleaningBufferHours")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="repairBufferHours">Repair Buffer (hrs)</Label>
            <Input id="repairBufferHours" type="number" {...form.register("repairBufferHours")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qualityCheckBufferHours">Quality Check Buffer (hrs)</Label>
            <Input id="qualityCheckBufferHours" type="number" {...form.register("qualityCheckBufferHours")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tightThresholdHours">&ldquo;Tight&rdquo; Threshold (hrs)</Label>
            <Input id="tightThresholdHours" type="number" {...form.register("tightThresholdHours")} />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium">Tax</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="taxLabel">Tax Label</Label>
            <Input id="taxLabel" placeholder="VAT" {...form.register("taxLabel")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input id="taxRate" type="number" step="0.1" {...form.register("taxRate")} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save Settings"}
      </Button>
    </form>
  );
}
