"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadGarmentImage } from "@/lib/actions/garment-actions";

export function GarmentImageUpload({ garmentId }: { garmentId: string }) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

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
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
        <ImagePlus className="size-4" /> {isPending ? "Uploading…" : "Upload Image"}
      </Button>
    </div>
  );
}
