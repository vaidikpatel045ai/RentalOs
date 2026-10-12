"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setSupportTicketStatus } from "@/lib/actions/support-actions";

export function TicketStatusButton({ ticketId, status }: { ticketId: string; status: "OPEN" | "RESOLVED" }) {
  const [isPending, startTransition] = useTransition();
  const next = status === "OPEN" ? "RESOLVED" : "OPEN";

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await setSupportTicketStatus(ticketId, next);
            toast.success(next === "RESOLVED" ? "Marked as resolved" : "Reopened");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Couldn't update the conversation");
          }
        })
      }
    >
      {status === "OPEN" ? <CheckCircle2 className="size-4" /> : <RotateCcw className="size-4" />}
      {status === "OPEN" ? "Mark resolved" : "Reopen"}
    </Button>
  );
}
