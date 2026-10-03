"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { organizationOnboardSchema, type OrganizationOnboardInput } from "@/lib/validations/organization";
import { createOrganization } from "@/lib/actions/organization-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Plan } from "@prisma/client";

const NO_PLAN = "__none__";

export function OrganizationOnboardForm({ plans }: { plans: Plan[] }) {
  const [isPending, startTransition] = useTransition();
  const [planId, setPlanId] = useState(NO_PLAN);
  const form = useForm<OrganizationOnboardInput>({
    resolver: zodResolver(organizationOnboardSchema),
    defaultValues: { country: "AE", currency: "AED", timezone: "Asia/Dubai", locale: "en-AE", taxLabel: "VAT", taxRate: 5 },
  });

  function onSubmit(values: OrganizationOnboardInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      fd.set(key, String(value));
    });
    if (planId !== NO_PLAN) fd.set("planId", planId);
    startTransition(async () => {
      const result = await createOrganization({}, fd);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-heading text-base">Boutique</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="organizationName">Boutique Name</Label>
            <Input id="organizationName" placeholder="Al Noor Bridal House" {...form.register("organizationName")} />
            {form.formState.errors.organizationName && (
              <p className="text-xs text-destructive">{form.formState.errors.organizationName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="No plan yet (trial)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PLAN}>No plan yet (trial)</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="font-heading text-base">Owner Account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ownerName">Owner Name</Label>
            <Input id="ownerName" {...form.register("ownerName")} />
            {form.formState.errors.ownerName && <p className="text-xs text-destructive">{form.formState.errors.ownerName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ownerEmail">Owner Email</Label>
            <Input id="ownerEmail" type="email" {...form.register("ownerEmail")} />
            {form.formState.errors.ownerEmail && <p className="text-xs text-destructive">{form.formState.errors.ownerEmail.message}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ownerPassword">Temporary Password</Label>
            <Input id="ownerPassword" type="text" placeholder="At least 8 characters" {...form.register("ownerPassword")} />
            {form.formState.errors.ownerPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.ownerPassword.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Share this with the boutique owner — they should change it after first login.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="font-heading text-base">First Branch</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Branch Name</Label>
            <Input id="name" placeholder="Al Noor Bridal House — Dubai" {...form.register("name")} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" placeholder="DXB" {...form.register("code")} />
            {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">Country (ISO-2)</Label>
            <Input id="country" {...form.register("country")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency (ISO-3)</Label>
            <Input id="currency" {...form.register("currency")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" {...form.register("timezone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxLabel">Tax Label</Label>
            <Input id="taxLabel" {...form.register("taxLabel")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input id="taxRate" type="number" step="0.1" {...form.register("taxRate")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...form.register("city")} />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create Boutique"}
      </Button>
    </form>
  );
}
