"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { appointmentSchema, APPOINTMENT_TYPES, type AppointmentInput } from "@/lib/validations/appointment";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/domain/combobox";
import type { Branch } from "@prisma/client";

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export function AppointmentForm({
  branches,
  defaultBranchId,
  action,
}: {
  branches: Branch[];
  defaultBranchId?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const form = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      branchId: defaultBranchId ?? branches[0]?.id ?? "",
      type: "NEW_CONSULTATION",
      durationMinutes: 60,
    },
  });

  const branchId = useWatch({ control: form.control, name: "branchId" });

  useEffect(() => {
    fetch(`/api/customers?branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []));
  }, [branchId]);

  const customerOptions: ComboboxOption[] = customers.map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName}`,
    sublabel: c.phone,
  }));

  function onSubmit(values: AppointmentInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      fd.set(key, value instanceof Date ? value.toISOString() : String(value));
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
        <div className="space-y-1.5">
          <Label>Customer</Label>
          <Combobox
            options={customerOptions}
            onChange={(v) => form.setValue("customerId", v)}
            placeholder="Select customer…"
            searchPlaceholder="Search by name or phone…"
          />
          {form.formState.errors.customerId && (
            <p className="text-xs text-destructive">{form.formState.errors.customerId.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            defaultValue={form.getValues("type")}
            onValueChange={(v) => form.setValue("type", v as AppointmentInput["type"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scheduledAt">Date & Time</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            onChange={(e) => form.setValue("scheduledAt", new Date(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input id="durationMinutes" type="number" {...form.register("durationMinutes")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="room">Room</Label>
          <Input id="room" {...form.register("room")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Create Appointment"}
      </Button>
    </form>
  );
}
