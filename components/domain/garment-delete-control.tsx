"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, RotateCcw } from "lucide-react";
import type { GarmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteGarment, restoreGarment } from "@/lib/actions/garment-actions";

export function GarmentDeleteControl({ garmentId, currentStatus, sku }: { garmentId: string; currentStatus: GarmentStatus; sku: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (currentStatus === "ARCHIVED") {
    return (
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            try {
              await restoreGarment(garmentId);
              toast.success(`${sku} restored to active inventory`);
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not restore garment");
            }
          });
        }}
      >
        <RotateCcw className="size-4" /> Restore
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
          <Trash2 className="size-4" /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {sku}?</DialogTitle>
          <DialogDescription>
            This removes the garment from active inventory and booking pickers. Its full rental history, revenue and
            photos are kept — nothing is permanently erased, and it can be restored at any time from this page.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await deleteGarment(garmentId);
                  toast.success(`${sku} removed from active inventory`);
                  setOpen(false);
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not delete garment");
                }
              });
            }}
          >
            {isPending ? "Deleting…" : "Delete Garment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
