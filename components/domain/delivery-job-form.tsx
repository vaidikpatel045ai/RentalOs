"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { deliveryJobSchema, DELIVERY_METHODS, type DeliveryJobInput } from "@/lib/validations/job";
import { createDeliveryJob } from "@/lib/actions/job-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/domain/combobox";
import { enumOptions } from "@/lib/format-enum";
import type { Branch } from "@prisma/client";

export function DeliveryJobForm({ branches, defaultBranchId }: { branches: Branch[]; defaultBranchId?: string }) {
  const [isPending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? "");
  const [bookings, setBookings] = useState<ComboboxOption[]>([]);
  const [drivers, setDrivers] = useState<ComboboxOption[]>([]);

  const form = useForm<DeliveryJobInput>({
    resolver: zodResolver(deliveryJobSchema),
    defaultValues: { type: "HOME_DELIVERY" },
  });

  useEffect(() => {
    fetch(`/api/bookings?branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) =>
        setBookings(
          (d.bookings ?? []).map((b: { id: string; bookingNumber: string; customerName: string }) => ({
            value: b.id,
            label: b.bookingNumber,
            sublabel: b.customerName,
          }))
        )
      );
    fetch(`/api/staff?role=DELIVERY&branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => setDrivers((d.staff ?? []).map((s: { id: string; name: string }) => ({ value: s.id, label: s.name }))));
  }, [branchId]);

  function onSubmit(values: DeliveryJobInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      fd.set(key, value instanceof Date ? value.toISOString() : String(value));
    });
    startTransition(async () => {
      const result = await createDeliveryJob({}, fd);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Branch</Label>
          <Select defaultValue={branchId} onValueChange={setBranchId}>
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
          <Label>Booking</Label>
          <Combobox options={bookings} onChange={(v) => form.setValue("bookingId", v)} placeholder="Select booking…" searchPlaceholder="Search booking # or customer…" />
          {form.formState.errors.bookingId && <p className="text-xs text-destructive">{form.formState.errors.bookingId.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select defaultValue="HOME_DELIVERY" onValueChange={(v) => form.setValue("type", v as DeliveryJobInput["type"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(DELIVERY_METHODS).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Assign Driver</Label>
          <Combobox options={drivers} onChange={(v) => form.setValue("assignedDriverId", v)} placeholder="Select driver…" searchPlaceholder="Search name…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" placeholder="Dubai Marina, Building 12, Apt 803" {...form.register("address")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+971501234567" {...form.register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scheduledDate">Scheduled Date</Label>
          <Input id="scheduledDate" type="date" onChange={(e) => form.setValue("scheduledDate", e.target.value ? new Date(e.target.value) : null)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="windowStart">Time Window</Label>
          <div className="flex gap-2">
            <Input id="windowStart" type="time" onChange={(e) => {
              const date = form.getValues("scheduledDate");
              if (date && e.target.value) {
                const [h, m] = e.target.value.split(":").map(Number);
                const d = new Date(date);
                d.setHours(h, m);
                form.setValue("windowStart", d);
              }
            }} />
            <Input id="windowEnd" type="time" onChange={(e) => {
              const date = form.getValues("scheduledDate");
              if (date && e.target.value) {
                const [h, m] = e.target.value.split(":").map(Number);
                const d = new Date(date);
                d.setHours(h, m);
                form.setValue("windowEnd", d);
              }
            }} />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create Delivery Job"}
      </Button>
    </form>
  );
}
