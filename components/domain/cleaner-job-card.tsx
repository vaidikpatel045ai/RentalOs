"use client";

import Image from "next/image";
import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
import { Shirt } from "lucide-react";
import type { CleaningStatus, CleaningType, Priority } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CleaningPrimaryAction, CleaningStatusSelect } from "@/components/domain/job-status-select";
import { CleaningPhotoUpload } from "@/components/domain/cleaning-photo-upload";
import { CleaningDetailsForm } from "@/components/domain/cleaning-details-form";

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

export function CleanerJobCard({ job }: { job: CleanerJobCardData }) {
  const overdue = job.dueAt && isPast(job.dueAt) && !isToday(job.dueAt) && job.status !== "COMPLETED";

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
          <CardTitle className="truncate font-heading text-base">{job.garment.sku}</CardTitle>
          <Link href={`/dashboard/garments/${job.garment.id}`} className="truncate text-xs text-muted-foreground hover:underline">
            {job.garment.name}
          </Link>
          {job.customerName && <p className="truncate text-xs text-muted-foreground">For {job.customerName}</p>}
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
        <p className="text-sm">
          <span className="text-muted-foreground">Cleaning:</span> {job.cleaningType.replaceAll("_", " ")}
        </p>
        {job.stainNotes && (
          <p className="text-sm">
            <span className="text-muted-foreground">Stain/Damage:</span> {job.stainNotes}
          </p>
        )}
        {job.instructions && <p className="text-sm text-muted-foreground">{job.instructions}</p>}

        <Separator />
        <CleaningPhotoUpload jobId={job.id} beforePhotos={job.beforePhotos} afterPhotos={job.afterPhotos} />

        <Separator />
        <CleaningDetailsForm jobId={job.id} initialCost={job.cost} initialNotes={job.notes ?? ""} />

        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CleaningPrimaryAction jobId={job.id} status={job.status} />
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">Set status directly…</summary>
          <div className="mt-2">
            <CleaningStatusSelect jobId={job.id} status={job.status} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
