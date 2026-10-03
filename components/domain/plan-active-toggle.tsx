"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { togglePlanActive } from "@/lib/actions/plan-actions";

export function PlanActiveToggle({ planId, isActive }: { planId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          try {
            await togglePlanActive(planId, checked);
            toast.success(checked ? "Plan activated" : "Plan deactivated");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update plan");
          }
        });
      }}
    />
  );
}
