"use client";

import Image from "next/image";
import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
import { Shirt } from "lucide-react";
import type { Priority, TailoringStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TailoringPrimaryAction, TailoringStatusSelect } from "@/components/domain/job-status-select";
import { AddJobNoteDialog } from "@/components/domain/add-job-note-dialog";
import { MeasurementSnapshotView } from "@/components/domain/measurement-snapshot-view";
import { isMeasurementSnapshot } from "@/lib/measurements";

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

export function TailorJobCard({ job }: { job: TailorJobCardData }) {
  const overdue = job.dueAt && isPast(job.dueAt) && !isToday(job.dueAt) && job.status !== "COMPLETED";
  const instructions = (job.instructions ?? {}) as Record<string, string>;
  const measurement = isMeasurementSnapshot(job.beforeMeasurements) ? job.beforeMeasurements : null;

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
          {job.garment.imageUrl ? (
            <Image src={job.garment.imageUrl} alt={job.garment.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Shirt className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate font-heading text-base">
            {job.customer ? `${job.customer.firstName} ${job.customer.lastName}` : job.garment.sku}
          </CardTitle>
          <Link href={`/dashboard/garments/${job.garment.id}`} className="truncate font-mono text-xs text-muted-foreground hover:underline">
            {job.garment.sku} — {job.garment.name}
          </Link>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={job.priority === "HIGH" || job.priority === "URGENT" ? "destructive" : "secondary"}>{job.priority}</Badge>
          {job.dueAt && (
            <span className={overdue ? "text-xs font-medium text-risk-unsafe" : "text-xs text-muted-foreground"}>
              {overdue ? "Overdue — " : "Due "}
              {format(job.dueAt, "d MMM")}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.keys(instructions).length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Alteration Instructions</p>
            <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
              {Object.entries(instructions).map(([k, v]) => (
                <li key={k}>
                  <span className="text-muted-foreground capitalize">{k}:</span> {v}
                </li>
              ))}
            </ul>
          </div>
        )}

        {job.notes && <p className="text-sm text-muted-foreground italic">&ldquo;{job.notes}&rdquo;</p>}

        {job.customer && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Body Measurements</p>
            <MeasurementSnapshotView snapshot={measurement} compact />
          </div>
        )}

        {job.tailoringNotes.length > 0 && (
          <div>
            <Separator className="mb-3" />
            <p className="mb-2 text-xs font-medium text-muted-foreground">Progress Updates</p>
            <div className="space-y-2">
              {job.tailoringNotes.map((n) => (
                <div key={n.id} className="rounded-md bg-muted/50 p-2 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{n.authorName ?? "You"}</span>
                    <span className="text-xs text-muted-foreground">{format(n.createdAt, "d MMM, HH:mm")}</span>
                  </div>
                  <p className="text-muted-foreground">{n.note}</p>
                  {n.photos.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {n.photos.map((url) => (
                        <div key={url} className="relative size-12 overflow-hidden rounded">
                          <Image src={url} alt="Progress photo" fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TailoringPrimaryAction jobId={job.id} status={job.status} />
          <AddJobNoteDialog jobId={job.id} />
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">Set status directly…</summary>
          <div className="mt-2">
            <TailoringStatusSelect jobId={job.id} status={job.status} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
