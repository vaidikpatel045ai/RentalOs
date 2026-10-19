"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadGarmentImage } from "@/lib/actions/garment-actions";
import { MAX_GARMENT_IMAGES } from "@/lib/validations/garment";

export function GarmentImageUpload({ garmentId, imageCount }: { garmentId: string; imageCount: number }) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const isFull = imageCount >= MAX_GARMENT_IMAGES;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.set("file", file);
          startTransition(async () => {
            const result = await uploadGarmentImage(garmentId, fd);
            if (result?.error) toast.error(result.error);
            else toast.success("Image uploaded");
            if (inputRef.current) inputRef.current.value = "";
          });
        }}
      />
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {imageCount} of {MAX_GARMENT_IMAGES} photos
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || isFull}
          title={isFull ? `Photo limit reached (${MAX_GARMENT_IMAGES} per garment)` : undefined}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-4" /> {isPending ? "Uploading…" : "Upload Image"}
        </Button>
      </div>
      {isFull && (
        <p className="mt-1 text-right text-xs text-muted-foreground">
          Photo limit reached ({MAX_GARMENT_IMAGES} per garment).
        </p>
      )}
    </div>
  );
}
