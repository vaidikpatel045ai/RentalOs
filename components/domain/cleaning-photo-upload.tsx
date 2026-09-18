"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { addCleaningPhoto } from "@/lib/actions/job-actions";

function PhotoSlot({ jobId, kind, photos, label }: { jobId: string; kind: "before" | "after"; photos: string[]; label: string }) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {photos.map((url) => (
          <div key={url} className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image src={url} alt={`${label} photo`} fill className="object-cover" />
          </div>
        ))}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set("file", file);
            startTransition(async () => {
              const result = await addCleaningPhoto(jobId, kind, fd);
              if (result?.error) toast.error(result.error);
              if (inputRef.current) inputRef.current.value = "";
            });
          }}
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
          aria-label={`Add ${label.toLowerCase()} photo`}
        >
          <Camera className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function CleaningPhotoUpload({
  jobId,
  beforePhotos,
  afterPhotos,
}: {
  jobId: string;
  beforePhotos: string[];
  afterPhotos: string[];
}) {
  return (
    <div className="flex gap-4">
      <PhotoSlot jobId={jobId} kind="before" photos={beforePhotos} label="Before" />
      <PhotoSlot jobId={jobId} kind="after" photos={afterPhotos} label="After" />
    </div>
  );
}
