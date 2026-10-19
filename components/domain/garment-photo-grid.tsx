"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteGarmentImage, setPrimaryGarmentImage } from "@/lib/actions/garment-actions";

interface GarmentPhoto {
  id: string;
  url: string;
  isPrimary: boolean;
}

export function GarmentPhotoGrid({
  photos,
  garmentName,
  canEdit,
}: {
  photos: GarmentPhoto[];
  garmentName: string;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const run = (action: () => Promise<{ error?: string } | undefined>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result?.error) toast.error(result.error);
      else toast.success(success);
    });

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
            <Image src={photo.url} alt={garmentName} fill className="object-cover" />
            {photo.isPrimary && (
              <span className="absolute left-1.5 top-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                Main
              </span>
            )}
            {canEdit && (
              // Always visible on touch screens; revealed on hover or keyboard focus elsewhere.
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                {!photo.isPrimary && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    disabled={isPending}
                    aria-label="Set as main photo"
                    title="Set as main photo"
                    onClick={() => run(() => setPrimaryGarmentImage(photo.id), "Main photo updated")}
                  >
                    <Star className="size-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="text-destructive"
                  disabled={isPending}
                  aria-label="Delete photo"
                  title="Delete photo"
                  onClick={() => setConfirmId(photo.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this photo?</DialogTitle>
            <DialogDescription>
              The photo is removed from this garment for good. If it was the main photo, the next one becomes the main
              photo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                const id = confirmId;
                if (!id) return;
                run(async () => {
                  const result = await deleteGarmentImage(id);
                  if (!result?.error) setConfirmId(null);
                  return result;
                }, "Photo deleted");
              }}
            >
              {isPending ? "Deleting…" : "Delete photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
