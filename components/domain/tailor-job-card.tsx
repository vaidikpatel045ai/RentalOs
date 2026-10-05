"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronDown, Ruler } from "lucide-react";
import type { Priority, TailoringStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { TailoringPrimaryAction, TailoringStatusSelect } from "@/components/domain/job-status-select";
import { AddJobNoteDialog } from "@/components/domain/add-job-note-dialog";
import { MeasurementSnapshotView } from "@/components/domain/measurement-snapshot-view";
import { DueChip, JobThumb, PriorityChip, dueState, urgencyEdge } from "@/components/domain/portal/job-meta";
import { JobProgress } from "@/components/domain/portal/job-progress";
import { isMeasurementSnapshot } from "@/lib/measurements";
import { cn } from "@/lib/utils";

export interface TailorJobCardData {
  id: string;
  status: TailoringStatus;
  priority: Priority;
  dueAt: Date | null;
  instructions: unknown;
  beforeMeasurements: unknown;
  notes: string | null;
  garment: { id: string; sku: string; name: string; imageUrl: string | null };
  customer: { id: string; firstName: string; lastName: string } | null;
  tailoringNotes: { id: string; note: string; photos: string[]; createdAt: Date; authorName: string | null }[];
}

const STEPS = ["Assigned", "Accepted", "In progress", "Ready for fitting"];
/** Main-path step for each status; revisions sit on "In progress", fitting feedback on "Ready for fitting". */
const STEP_INDEX: Record<TailoringStatus, number> = {
  ASSIGNED: 0,
  ACCEPTED: 1,
  IN_PROGRESS: 2,
  REVISION_REQUIRED: 2,
  READY_FOR_FITTING: 3,
  FITTING_FEEDBACK: 3,
  COMPLETED: 4,
};
const DETOUR: Partial<Record<TailoringStatus, string>> = {
  REVISION_REQUIRED: "Revision needed",
  FITTING_FEEDBACK: "Fitting feedback received",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Update({ update }: { update: TailorJobCardData["tailoringNotes"][number] }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{update.authorName ?? "You"}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{format(update.createdAt, "d MMM, HH:mm")}</span>
      </div>
      <p className="mt-0.5 text-muted-foreground">{update.note}</p>
      {update.photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {update.photos.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="relative size-14 overflow-hidden rounded-md">
              <Image src={url} alt="Progress photo" fill sizes="56px" className="object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function TailorJobCard({ job }: { job: TailorJobCardData }) {
  const state = dueState(job.dueAt, job.status === "COMPLETED");
  const instructions = Object.entries((job.instructions ?? {}) as Record<string, string>).filter(([, v]) => v);
  const measurement = isMeasurementSnapshot(job.beforeMeasurements) ? job.beforeMeasurements : null;
  const [latest, ...older] = job.tailoringNotes;
  const title = job.customer ? `${job.customer.firstName} ${job.customer.lastName}` : job.garment.name;

  return (
    <Card className={cn("gap-0 overflow-hidden py-0", urgencyEdge(state, job.priority))}>
      <div className="flex gap-3 p-4 sm:gap-4 sm:p-5">
        <JobThumb imageUrl={job.garment.imageUrl} alt={job.garment.name} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div>
            <h3 className="truncate font-heading text-lg leading-snug">{title}</h3>
            <Link
              href={`/dashboard/garments/${job.garment.id}`}
              className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              <span className="font-mono">{job.garment.sku}</span> · {job.garment.name}
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

        {(instructions.length > 0 || job.notes) && (
          <Section title="What to do">
            {instructions.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {instructions.map(([part, change]) => (
                  <li key={part} className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-sm">
                    <span className="capitalize text-muted-foreground">{part}</span> <span className="font-medium">{change}</span>
                  </li>
                ))}
              </ul>
            )}
            {job.notes && <p className="border-l-2 border-gold/60 pl-3 text-sm text-muted-foreground">{job.notes}</p>}
          </Section>
        )}

        {job.customer && (
          <details className="group rounded-lg border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Ruler className="size-4 text-muted-foreground" />
                Body measurements
                {!measurement && <span className="font-normal text-muted-foreground">· none on file</span>}
              </span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border px-3 py-3">
              <MeasurementSnapshotView snapshot={measurement} compact />
            </div>
          </details>
        )}

        {latest && (
          <Section title={`Progress updates (${job.tailoringNotes.length})`}>
            <Update update={latest} />
            {older.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show {older.length} earlier update{older.length === 1 ? "" : "s"}</span>
                  <span className="hidden group-open:inline">Hide earlier updates</span>
                </summary>
                <div className="mt-2 space-y-2">
                  {older.map((n) => (
                    <Update key={n.id} update={n} />
                  ))}
                </div>
              </details>
            )}
          </Section>
        )}
      </div>

      <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TailoringPrimaryAction jobId={job.id} status={job.status} className="h-10 w-full sm:h-9 sm:w-auto" />
          <AddJobNoteDialog jobId={job.id} className="h-10 w-full sm:h-9 sm:w-auto" />
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground">Set status directly…</summary>
          <div className="mt-2">
            <TailoringStatusSelect jobId={job.id} status={job.status} />
          </div>
        </details>
      </div>
    </Card>
  );
}
