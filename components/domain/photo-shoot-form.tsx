"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { photoShootSchema, PHOTO_SHOOT_TYPES, type PhotoShootInput } from "@/lib/validations/photography";
import { enumLabel } from "@/lib/format-enum";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/domain/combobox";

export interface ShootFormBranch {
  id: string;
  name: string;
  currency: string;
}
export interface ShootFormService {
  id: string;
  branchId: string;
  name: string;
  type: PhotoShootInput["type"];
  price: number;
  durationMinutes: number;
}
export interface ShootFormPhotographer {
  id: string;
  name: string;
  branchId: string | null;
}
interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const NONE = "__none__";

export function PhotoShootForm({
  branches,
  services,
  photographers,
  action,
  defaultValues,
  initialCustomer,
  submitLabel = "Book shoot",
}: {
  branches: ShootFormBranch[];
  services: ShootFormService[];
  photographers: ShootFormPhotographer[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<PhotoShootInput>;
  /** The saved client when editing, so they show even if not in the recent list. */
  initialCustomer?: CustomerOption;
  submitLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState<CustomerOption[]>(initialCustomer ? [initialCustomer] : []);
  const form = useForm<PhotoShootInput>({
    resolver: zodResolver(photoShootSchema),
    defaultValues: {
      branchId: branches[0]?.id ?? "",
      type: "PRE_WEDDING",
      durationMinutes: 120,
      price: 0,
      discount: 0,
      ...defaultValues,
    },
  });
  const { errors } = form.formState;

  const branchId = useWatch({ control: form.control, name: "branchId" });
  const serviceId = useWatch({ control: form.control, name: "serviceId" });
  const photographerId = useWatch({ control: form.control, name: "photographerId" });
  const type = useWatch({ control: form.control, name: "type" });
  const customerId = useWatch({ control: form.control, name: "customerId" });
  const currency = branches.find((b) => b.id === branchId)?.currency ?? "AED";

  useEffect(() => {
    fetch(`/api/customers?branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => {
        const list: CustomerOption[] = d.customers ?? [];
        setCustomers(initialCustomer && !list.some((c) => c.id === initialCustomer.id) ? [initialCustomer, ...list] : list);
      });
  }, [branchId, initialCustomer]);

  // Filled in after mount: on the server this would format in UTC, and the
  // shoot would move by the timezone offset when saved.
  const dateInputRef = useRef<HTMLInputElement>(null);
  const initialDate = defaultValues?.scheduledAt;
  useEffect(() => {
    if (dateInputRef.current && initialDate instanceof Date && !Number.isNaN(initialDate.getTime())) {
      dateInputRef.current.value = format(initialDate, "yyyy-MM-dd'T'HH:mm");
    }
  }, [initialDate]);

  const branchServices = services.filter((s) => s.branchId === branchId);
  const branchPhotographers = photographers.filter((p) => !p.branchId || p.branchId === branchId);
  const customerOptions: ComboboxOption[] = customers.map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName}`,
    sublabel: c.phone,
  }));

  function pickService(id: string) {
    if (id === NONE) {
      form.setValue("serviceId", "");
      return;
    }
    const service = services.find((s) => s.id === id);
    form.setValue("serviceId", id);
    if (service) {
      form.setValue("type", service.type);
      form.setValue("price", service.price);
      form.setValue("durationMinutes", service.durationMinutes);
    }
  }

  function onSubmit(values: PhotoShootInput) {
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
        {branches.length > 1 && (
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select
              value={branchId}
              onValueChange={(v) => {
                form.setValue("branchId", v);
                form.setValue("serviceId", "");
                form.setValue("photographerId", "");
                form.setValue("customerId", "");
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
        )}
        <div className="space-y-1.5">
          <Label>Client</Label>
          <Combobox
            options={customerOptions}
            value={customerId}
            onChange={(v) => form.setValue("customerId", v, { shouldValidate: true })}
            placeholder="Select client…"
            searchPlaceholder="Search by name or phone…"
            emptyText="No clients found. Add them under Customers first."
          />
          {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Service</Label>
          <Select value={serviceId || NONE} onValueChange={pickService}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Custom shoot (set the price below)</SelectItem>
              {branchServices.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => form.setValue("type", v as PhotoShootInput["type"])}>
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
          <Label>Photographer</Label>
          <Select value={photographerId || NONE} onValueChange={(v) => form.setValue("photographerId", v === NONE ? "" : v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Assign later</SelectItem>
              {branchPhotographers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {branchPhotographers.length === 0 && (
            <p className="text-xs text-muted-foreground">No photographers yet. Add one under Staff with the Photographer role.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scheduledAt">Date & time</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            ref={dateInputRef}
            onChange={(e) => form.setValue("scheduledAt", e.target.value ? new Date(e.target.value) : (undefined as unknown as Date), { shouldValidate: true })}
          />
          {errors.scheduledAt && <p className="text-xs text-destructive">Pick a date and time</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input id="durationMinutes" type="number" min={15} step={15} {...form.register("durationMinutes")} />
          {errors.durationMinutes && <p className="text-xs text-destructive">{errors.durationMinutes.message}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="Studio, beach, venue address…" {...form.register("location")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price ({currency})</Label>
          <Input id="price" type="number" min={0} step="0.01" {...form.register("price")} />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discount">Discount ({currency})</Label>
          <Input id="discount" type="number" min={0} step="0.01" {...form.register("discount")} />
          {errors.discount && <p className="text-xs text-destructive">{errors.discount.message}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes">Notes for the photographer</Label>
          <Textarea id="notes" rows={3} placeholder="Outfits, props, shots the couple wants…" {...form.register("notes")} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
