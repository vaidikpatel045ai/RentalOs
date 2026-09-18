"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { GarmentStatus } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeGarmentStatus } from "@/lib/actions/garment-actions";
import { GARMENT_STATUSES } from "@/lib/validations/garment";

const ALL_STATUSES = GARMENT_STATUSES satisfies readonly GarmentStatus[];

export function GarmentStatusControl({ garmentId, currentStatus }: { garmentId: string; currentStatus: GarmentStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={currentStatus}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          try {
            await changeGarmentStatus(garmentId, value as GarmentStatus, "Manual status change");
            toast.success("Status updated");
          } catch {
            toast.error("Could not update status");
          }
        });
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s.replaceAll("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
