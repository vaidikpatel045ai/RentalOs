"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { customerSchema, type CustomerInput } from "@/lib/validations/customer";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Branch } from "@prisma/client";

interface CustomerFormProps {
  branches: Branch[];
  defaultBranchId?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<CustomerInput>;
  submitLabel?: string;
}

export function CustomerForm({ branches, defaultBranchId, action, defaultValues, submitLabel = "Save Customer" }: CustomerFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      branchId: defaultBranchId ?? branches[0]?.id ?? "",
      preferredLanguage: "EN",
      favoriteDesigners: [],
      ...defaultValues,
    },
  });

  function onSubmit(values: CustomerInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) fd.set(key, value.join(","));
      else if (value instanceof Date) fd.set(key, value.toISOString());
      else fd.set(key, String(value));
    });

    startTransition(async () => {
      const result = await action({}, fd);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" {...form.register("firstName")} />
          {form.formState.errors.firstName && (
            <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" {...form.register("lastName")} />
          {form.formState.errors.lastName && (
            <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (E.164)</Label>
          <Input id="phone" placeholder="+971501234567" {...form.register("phone")} />
          {form.formState.errors.phone && (
            <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" placeholder="+971501234567" {...form.register("whatsapp")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nationality">Nationality</Label>
          <Input id="nationality" {...form.register("nationality")} />
        </div>
        <div className="space-y-1.5">
          <Label>Preferred Language</Label>
          <Select
            defaultValue={form.getValues("preferredLanguage")}
            onValueChange={(v) => form.setValue("preferredLanguage", v as CustomerInput["preferredLanguage"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EN">English</SelectItem>
              <SelectItem value="AR">Arabic</SelectItem>
              <SelectItem value="HI">Hindi</SelectItem>
              <SelectItem value="UR">Urdu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Branch</Label>
          <Select
            defaultValue={form.getValues("branchId")}
            onValueChange={(v) => form.setValue("branchId", v)}
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
          <Label htmlFor="weddingDate">Wedding Date</Label>
          <Input
            id="weddingDate"
            type="date"
            onChange={(e) => form.setValue("weddingDate", e.target.value ? new Date(e.target.value) : null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weddingVenue">Wedding Venue</Label>
          <Input id="weddingVenue" {...form.register("weddingVenue")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eventType">Event Type</Label>
          <Input id="eventType" placeholder="Reception, Nikkah, Engagement…" {...form.register("eventType")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="stylePreferences">Style Preferences</Label>
        <Textarea id="stylePreferences" rows={2} {...form.register("stylePreferences")} />
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
