"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DamageChargeStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { updateDamageChargeStatus } from "@/lib/actions/condition-report-actions";

export function DamageChargeActions({ chargeId, amount }: { chargeId: string; amount: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(status: DamageChargeStatus) {
    startTransition(async () => {
      const result = await updateDamageChargeStatus(chargeId, status, status === "APPROVED" ? amount : undefined);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Charge ${status.toLowerCase()}`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button size="xs" variant="outline" disabled={isPending} onClick={() => run("APPROVED")}>
        Approve
      </Button>
      <Button size="xs" variant="ghost" disabled={isPending} onClick={() => run("WAIVED")}>
        Waive
      </Button>
    </div>
  );
}
