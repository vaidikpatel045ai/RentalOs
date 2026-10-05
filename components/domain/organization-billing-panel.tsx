"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrganizationBilling, setOrganizationStatus, markOrganizationPaid } from "@/lib/actions/organization-actions";
import { ORGANIZATION_STATUSES } from "@/lib/validations/organization";
import { enumLabel } from "@/lib/format-enum";
import type { OrganizationStatus } from "@prisma/client";

const NO_PLAN = "__none__";

// Plain shapes only: Prisma Decimal fields (plan price, branch taxRate) can't
// be passed from a server page to a client component.
export interface BillingPanelOrganization {
  id: string;
  status: OrganizationStatus;
  planId: string | null;
  billingNotes: string | null;
}
export interface PlanOption {
  id: string;
  name: string;
}

export function OrganizationBillingPanel({ organization, plans }: { organization: BillingPanelOrganization; plans: PlanOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(organization.status);
  const [planId, setPlanId] = useState(organization.planId ?? NO_PLAN);
  const router = useRouter();

  function onSave(formData: FormData) {
    formData.set("status", status);
    formData.set("planId", planId === NO_PLAN ? "" : planId);
    startTransition(async () => {
      const result = await updateOrganizationBilling(organization.id, {}, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Billing updated");
      router.refresh();
    });
  }

  function quickAction(action: () => Promise<void>, label: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(label);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update organization");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending} onClick={() => quickAction(() => markOrganizationPaid(organization.id), "Marked paid")}>
          Mark Paid
        </Button>
        {organization.status !== "SUSPENDED" && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => quickAction(() => setOrganizationStatus(organization.id, "SUSPENDED"), "Organization suspended")}
          >
            Suspend
          </Button>
        )}
        {organization.status === "SUSPENDED" && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => quickAction(() => setOrganizationStatus(organization.id, "ACTIVE"), "Organization reactivated")}
          >
            Reactivate
          </Button>
        )}
        {organization.status !== "CANCELLED" && (
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={isPending}
            onClick={() => quickAction(() => setOrganizationStatus(organization.id, "CANCELLED"), "Organization cancelled")}
          >
            Cancel
          </Button>
        )}
      </div>

      <form action={onSave} className="space-y-4 border-t border-border pt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {enumLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PLAN}>No plan</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="billingNotes">Billing Notes</Label>
          <Textarea id="billingNotes" name="billingNotes" rows={3} defaultValue={organization.billingNotes ?? ""} placeholder="e.g. paid via bank transfer 3 Oct" />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save Billing"}
        </Button>
      </form>
    </div>
  );
}
