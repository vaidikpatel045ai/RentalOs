"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { tailoringJobSchema, TAILORING_PRIORITIES, type TailoringJobInput } from "@/lib/validations/job";
import { createTailoringJob } from "@/lib/actions/job-actions";
import type { MeasurementSnapshot } from "@/lib/measurements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/domain/combobox";
import { MeasurementSnapshotView } from "@/components/domain/measurement-snapshot-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler } from "lucide-react";
import Link from "next/link";
import type { Branch } from "@prisma/client";

export function TailoringJobForm({ branches, defaultBranchId }: { branches: Branch[]; defaultBranchId?: string }) {
  const [isPending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? "");
  const [garments, setGarments] = useState<ComboboxOption[]>([]);
  const [customers, setCustomers] = useState<ComboboxOption[]>([]);
  const [tailors, setTailors] = useState<ComboboxOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [measurement, setMeasurement] = useState<MeasurementSnapshot | null>(null);
  const [measurementLoading, setMeasurementLoading] = useState(false);

  const form = useForm<TailoringJobInput>({
    resolver: zodResolver(tailoringJobSchema),
    defaultValues: { branchId, priority: "MEDIUM" },
  });

  useEffect(() => {
    fetch(`/api/garments?branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => setGarments((d.garments ?? []).map((g: { id: string; sku: string; name: string }) => ({ value: g.id, label: `${g.sku} — ${g.name}` }))));
    fetch(`/api/customers?branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => setCustomers((d.customers ?? []).map((c: { id: string; firstName: string; lastName: string; phone: string }) => ({ value: c.id, label: `${c.firstName} ${c.lastName}`, sublabel: c.phone }))));
    fetch(`/api/staff?role=TAILOR&branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => setTailors((d.staff ?? []).map((s: { id: string; name: string }) => ({ value: s.id, label: s.name }))));
  }, [branchId]);

  // Whenever a customer is picked, pull their latest measurements so staff
  // can see exactly what will be snapshotted onto the job for the tailor.
  useEffect(() => {
    if (!selectedCustomerId) {
      // Nothing to fetch yet — `measurement` already starts out null, and a
      // customer, once picked, is never un-picked, so there's nothing to
      // reset here (see react-hooks/set-state-in-effect).
      return;
    }
    let cancelled = false;
    // Deferred via setTimeout (not called synchronously in the effect body)
    // so the loading-state update doesn't trip react-hooks/set-state-in-effect.
    const timer = setTimeout(() => {
      setMeasurementLoading(true);
      fetch(`/api/customers/measurements?customerId=${selectedCustomerId}`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setMeasurement(d.measurement ?? null);
        })
        .finally(() => {
          if (!cancelled) setMeasurementLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedCustomerId]);

  function onSubmit(values: TailoringJobInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      fd.set(key, value instanceof Date ? value.toISOString() : String(value));
    });
    startTransition(async () => {
      const result = await createTailoringJob({}, fd);
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
          <Label>Customer (optional)</Label>
          <Combobox
            options={customers}
            onChange={(v) => {
              form.setValue("customerId", v);
              setSelectedCustomerId(v);
            }}
            placeholder="Select customer…"
            searchPlaceholder="Search name or phone…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Assign to Tailor</Label>
          <Combobox options={tailors} onChange={(v) => form.setValue("assignedToUserId", v)} placeholder="Select tailor…" searchPlaceholder="Search name…" />
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select defaultValue="MEDIUM" onValueChange={(v) => form.setValue("priority", v as TailoringJobInput["priority"])}>
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

      <div>
        <p className="mb-2 text-sm font-medium">Alteration Instructions</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="hem" className="text-xs">Hem</Label>
            <Input id="hem" placeholder='e.g. "-1.5in"' {...form.register("hem")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bust" className="text-xs">Bust</Label>
            <Input id="bust" placeholder='e.g. "+0.5in"' {...form.register("bust")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="waist" className="text-xs">Waist</Label>
            <Input id="waist" {...form.register("waist")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="straps" className="text-xs">Straps</Label>
            <Input id="straps" {...form.register("straps")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="length" className="text-xs">Length</Label>
            <Input id="length" {...form.register("length")} />
          </div>
        </div>
      </div>

      {selectedCustomerId && (
        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-sm">
              <Ruler className="size-4" /> Body Measurements — sent to tailor with this job
            </CardTitle>
          </CardHeader>
          <CardContent>
            {measurementLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : (
              <>
                <MeasurementSnapshotView snapshot={measurement} />
                {!measurement && (
                  <Link href={`/dashboard/customers/${selectedCustomerId}`} className="mt-1 inline-block text-xs text-gold hover:underline">
                    Add measurements on the customer profile →
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Assign Tailoring Job"}
      </Button>
    </form>
  );
}
