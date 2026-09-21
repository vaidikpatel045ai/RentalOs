"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TransferStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { approveTransfer, rejectTransfer, markTransferInTransit, markTransferReceived } from "@/lib/actions/transfer-actions";

export function TransferActionsControl({ transferId, status }: { transferId: string; status: TransferStatus }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: (id: string) => Promise<void>, label: string) {
    startTransition(async () => {
      try {
        await action(transferId);
        toast.success(label);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update transfer");
      }
    });
  }

  if (status === "REQUESTED") {
    return (
      <div className="flex justify-end gap-1.5">
        <Button size="xs" disabled={isPending} onClick={() => run(approveTransfer, "Transfer approved")}>
          Approve
        </Button>
        <Button size="xs" variant="ghost" disabled={isPending} onClick={() => run(rejectTransfer, "Transfer rejected")}>
          Reject
        </Button>
      </div>
    );
  }
  if (status === "APPROVED") {
    return (
      <Button size="xs" disabled={isPending} onClick={() => run(markTransferInTransit, "Marked in transit")}>
        Mark In Transit
      </Button>
    );
  }
  if (status === "IN_TRANSIT") {
    return (
      <Button size="xs" disabled={isPending} onClick={() => run(markTransferReceived, "Transfer received")}>
        Mark Received
      </Button>
    );
  }
  return <span className="text-xs text-muted-foreground">{status.replaceAll("_", " ")}</span>;
}
