"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronRight } from "lucide-react";
import type { CleaningStatus, DeliveryStatus, TailoringStatus } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateCleaningStatus, updateDeliveryStatus, updateTailoringStatus } from "@/lib/actions/job-actions";
import {
  nextTailoringStatus,
  nextCleaningStatus,
  TAILORING_NEXT_ACTION_LABEL,
  CLEANING_NEXT_ACTION_LABEL,
} from "@/lib/validations/job";

const TAILORING_STATUSES: TailoringStatus[] = [
  "ASSIGNED",
  "ACCEPTED",
  "IN_PROGRESS",
  "READY_FOR_FITTING",
  "FITTING_FEEDBACK",
  "REVISION_REQUIRED",
  "COMPLETED",
];
const CLEANING_STATUSES: CleaningStatus[] = [
  "RECEIVED",
  "INSPECTION",
  "CLEANING",
  "DRYING",
  "FINISHING",
  "QUALITY_CHECK",
  "READY",
  "FAILED_QC",
  "RE_CLEAN",
  "COMPLETED",
];
const DELIVERY_STATUSES: DeliveryStatus[] = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "RESCHEDULED", "RETURNED"];

function StatusSelect<T extends string>({
  jobId,
  status,
  options,
  onUpdate,
}: {
  jobId: string;
  status: T;
  options: T[];
  onUpdate: (jobId: string, status: T) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Select
      defaultValue={status}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          try {
            await onUpdate(jobId, value as T);
            toast.success("Status updated");
          } catch {
            toast.error("Could not update status");
          }
        });
      }}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((s) => (
          <SelectItem key={s} value={s}>
            {s.replaceAll("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TailoringStatusSelect({ jobId, status }: { jobId: string; status: TailoringStatus }) {
  return <StatusSelect jobId={jobId} status={status} options={TAILORING_STATUSES} onUpdate={updateTailoringStatus} />;
}
export function CleaningStatusSelect({ jobId, status }: { jobId: string; status: CleaningStatus }) {
  return <StatusSelect jobId={jobId} status={status} options={CLEANING_STATUSES} onUpdate={updateCleaningStatus} />;
}
export function DeliveryStatusSelect({ jobId, status }: { jobId: string; status: DeliveryStatus }) {
  return <StatusSelect jobId={jobId} status={status} options={DELIVERY_STATUSES} onUpdate={updateDeliveryStatus} />;
}

/**
 * One-tap "next step" button for the tailor/cleaner portals — the common
 * path through the workflow shouldn't require opening a dropdown and
 * finding the right status name. The full status Select stays available
 * underneath for exceptions (revisions, failed QC, re-clean).
 */
function PrimaryAction<T extends string>({
  jobId,
  next,
  label,
  onUpdate,
}: {
  jobId: string;
  next: T | null;
  label: string;
  onUpdate: (jobId: string, status: T) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  if (!next) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-risk-safe">
        <Check className="size-4" /> Completed
      </div>
    );
  }

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            await onUpdate(jobId, next);
            toast.success(label);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update status");
          }
        });
      }}
    >
      {isPending ? "Saving…" : label}
      {!isPending && <ChevronRight className="size-4" />}
    </Button>
  );
}

export function TailoringPrimaryAction({ jobId, status }: { jobId: string; status: TailoringStatus }) {
  return (
    <PrimaryAction
      jobId={jobId}
      next={nextTailoringStatus(status)}
      label={TAILORING_NEXT_ACTION_LABEL[status]}
      onUpdate={updateTailoringStatus}
    />
  );
}

export function CleaningPrimaryAction({ jobId, status }: { jobId: string; status: CleaningStatus }) {
  return (
    <PrimaryAction
      jobId={jobId}
      next={nextCleaningStatus(status)}
      label={CLEANING_NEXT_ACTION_LABEL[status]}
      onUpdate={updateCleaningStatus}
    />
  );
}
