"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cleaningJobSchema, CLEANING_TYPES, TAILORING_PRIORITIES, type CleaningJobInput } from "@/lib/validations/job";
import { createCleaningJob } from "@/lib/actions/job-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/domain/combobox";
import { enumOptions } from "@/lib/format-enum";
import type { Branch } from "@prisma/client";

export function CleaningJobForm({ branches, defaultBranchId }: { branches: Branch[]; defaultBranchId?: string }) {
  const [isPending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? "");
  const [garments, setGarments] = useState<ComboboxOption[]>([]);
  const [cleaners, setCleaners] = useState<ComboboxOption[]>([]);

  const form = useForm<CleaningJobInput>({
    resolver: zodResolver(cleaningJobSchema),
    defaultValues: { branchId, cleaningType: "DRY_CLEAN", priority: "MEDIUM" },
  });

  useEffect(() => {
    fetch(`/api/garments?branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => setGarments((d.garments ?? []).map((g: { id: string; sku: string; name: string }) => ({ value: g.id, label: `${g.sku} — ${g.name}` }))));
    fetch(`/api/staff?role=CLEANER&branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => setCleaners((d.staff ?? []).map((s: { id: string; name: string }) => ({ value: s.id, label: s.name }))));
  }, [branchId]);

  function onSubmit(values: CleaningJobInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      fd.set(key, value instanceof Date ? value.toISOString() : String(value));
    });
    startTransition(async () => {
      const result = await createCleaningJob({}, fd);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Branch</Label>
          <Select
            defaultValue={branchId}
            onValueChange={(v) => {
              setBranchId(v);
              form.setValue("branchId", v);
            }}
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
        </div>
        <div className="space-y-1.5">
          <Label>Garment</Label>
          <Combobox options={garments} onChange={(v) => form.setValue("garmentId", v)} placeholder="Select garment…" searchPlaceholder="Search SKU or name…" />
          {form.formState.errors.garmentId && <p className="text-xs text-destructive">{form.formState.errors.garmentId.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Cleaning Type</Label>
          <Select defaultValue="DRY_CLEAN" onValueChange={(v) => form.setValue("cleaningType", v as CleaningJobInput["cleaningType"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(CLEANING_TYPES).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Assign to Cleaner</Label>
          <Combobox options={cleaners} onChange={(v) => form.setValue("assignedToUserId", v)} placeholder="Select cleaner…" searchPlaceholder="Search name…" />
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select defaultValue="MEDIUM" onValueChange={(v) => form.setValue("priority", v as CleaningJobInput["priority"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAILORING_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueAt">Due Date</Label>
          <Input id="dueAt" type="date" onChange={(e) => form.setValue("dueAt", e.target.value ? new Date(e.target.value) : null)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="stainNotes">Stain / Damage Notes</Label>
        <Input id="stainNotes" placeholder="e.g. Light makeup stain near neckline" {...form.register("stainNotes")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="instructions">Cleaning Instructions</Label>
        <Textarea id="instructions" rows={2} placeholder="e.g. Handle beading with care — spot clean only." {...form.register("instructions")} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create Cleaning Job"}
      </Button>
    </form>
  );
}
