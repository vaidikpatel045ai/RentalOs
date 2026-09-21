"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { RepairStatus } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateRepairStatus } from "@/lib/actions/condition-report-actions";
import { enumLabel } from "@/lib/format-enum";

const REPAIR_STATUSES: RepairStatus[] = ["REQUIRED", "IN_PROGRESS", "COMPLETED"];

export function RepairStatusControl({ repairId, status }: { repairId: string; status: RepairStatus }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Select
      defaultValue={status}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          try {
            await updateRepairStatus(repairId, value as RepairStatus);
            toast.success("Repair status updated");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update repair status");
          }
        });
      }}
    >
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REPAIR_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {enumLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
