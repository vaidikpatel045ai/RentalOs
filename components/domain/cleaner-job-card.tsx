"use client";

import Link from "next/link";
import { AlertTriangle, ChevronDown, Receipt } from "lucide-react";
import type { CleaningStatus, CleaningType, Priority } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { CleaningPrimaryAction, CleaningStatusSelect } from "@/components/domain/job-status-select";
import { CleaningPhotoUpload } from "@/components/domain/cleaning-photo-upload";
import { CleaningDetailsForm } from "@/components/domain/cleaning-details-form";
import { DueChip, JobThumb, PriorityChip, dueState, urgencyEdge } from "@/components/domain/portal/job-meta";
import { JobProgress } from "@/components/domain/portal/job-progress";
import { enumLabel } from "@/lib/format-enum";
import { cn } from "@/lib/utils";

export interface CleanerJobCardData {
  id: string;
  status: CleaningStatus;
  cleaningType: CleaningType;
  priority: Priority;
  dueAt: Date | null;
  stainNotes: string | null;
  instructions: string | null;
  notes: string | null;
  cost: number;
  beforePhotos: string[];
  afterPhotos: string[];
  garment: { id: string; sku: string; name: string; imageUrl: string | null };
  customerName: string | null;
}

const STEPS = ["Received", "Inspection", "Cleaning", "Drying", "Finishing", "Quality check", "Ready"];
/** Main-path step for each status; a failed QC or re-clean goes back to "Cleaning". */
const STEP_INDEX: Record<CleaningStatus, number> = {
  RECEIVED: 0,
  INSPECTION: 1,
  CLEANING: 2,
  FAILED_QC: 2,
  RE_CLEAN: 2,
  DRYING: 3,
  FINISHING: 4,
  QUALITY_CHECK: 5,
  READY: 6,
  COMPLETED: 7,
};
const DETOUR: Partial<Record<CleaningStatus, string>> = {
  FAILED_QC: "Failed quality check",
  RE_CLEAN: "Re-clean",
};

export function CleanerJobCard({ job }: { job: CleanerJobCardData }) {
  const state = dueState(job.dueAt, job.status === "COMPLETED");

  return (
    <Card className={cn("gap-0 overflow-hidden py-0", urgencyEdge(state, job.priority))}>
      <div className="flex gap-3 p-4 sm:gap-4 sm:p-5">
        <JobThumb imageUrl={job.garment.imageUrl} alt={job.garment.name} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div>
            <h3 className="truncate font-heading text-lg leading-snug">
              <span className="font-mono text-base">{job.garment.sku}</span>{" "}
              <span className="text-base text-muted-foreground">· {enumLabel(job.cleaningType)}</span>
            </h3>
            <Link
              href={`/dashboard/garments/${job.garment.id}`}
              className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {job.garment.name}
              {job.customerName ? ` · for ${job.customerName}` : ""}
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <DueChip dueAt={job.dueAt} state={state} />
            <PriorityChip priority={job.priority} />
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
        <JobProgress
          steps={STEPS}
          current={STEP_INDEX[job.status]}
          currentLabel={STEPS[Math.min(STEP_INDEX[job.status], STEPS.length - 1)]}
          detour={DETOUR[job.status]}
        />

        {job.stainNotes && (
          <div className="flex gap-2 rounded-lg bg-risk-tight/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-risk-tight" />
            <div>
              <p className="font-medium">Stain or damage</p>
              <p className="text-muted-foreground">{job.stainNotes}</p>
            </div>
          </div>
        )}
        {job.instructions && <p className="border-l-2 border-gold/60 pl-3 text-sm text-muted-foreground">{job.instructions}</p>}

        <div className="rounded-lg border border-border p-3">
          <CleaningPhotoUpload jobId={job.id} beforePhotos={job.beforePhotos} afterPhotos={job.afterPhotos} />
        </div>

        <details className="group rounded-lg border border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              Cost &amp; notes
              <span className="font-normal text-muted-foreground">
                {job.cost > 0 ? `· AED ${job.cost.toFixed(2)}` : "· not added"}
              </span>
            </span>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border px-3 py-3">
            <CleaningDetailsForm jobId={job.id} initialCost={job.cost} initialNotes={job.notes ?? ""} />
          </div>
        </details>
      </div>

      <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
        <CleaningPrimaryAction jobId={job.id} status={job.status} className="h-10 w-full sm:h-9 sm:w-auto" />
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground">Set status directly…</summary>
          <div className="mt-2">
            <CleaningStatusSelect jobId={job.id} status={job.status} />
          </div>
        </details>
      </div>
    </Card>
  );
}
