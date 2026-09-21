"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { deleteSupplier } from "@/lib/actions/supplier-actions";

export function SupplierDeleteControl({ supplierId, name }: { supplierId: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <Trash2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>This permanently removes the supplier record. It can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await deleteSupplier(supplierId);
                  toast.success(`${name} removed`);
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not remove supplier");
                }
              });
            }}
          >
            {isPending ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
