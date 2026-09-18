"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { refundDeposit } from "@/lib/actions/payment-actions";

export function RefundDepositDialog({ depositId, remaining }: { depositId: string; remaining: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(remaining);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Undo2 className="size-4" /> Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund Deposit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input type="number" value={amount} max={remaining} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Returned in good condition" />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await refundDeposit(depositId, amount, reason);
                if (result?.error) toast.error(result.error);
                else {
                  toast.success("Deposit refunded");
                  setOpen(false);
                }
              });
            }}
          >
            {isPending ? "Processing…" : "Confirm Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
