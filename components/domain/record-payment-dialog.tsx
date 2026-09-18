"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { PaymentType, TransactionMethod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordPayment } from "@/lib/actions/payment-actions";

const PAYMENT_TYPES: PaymentType[] = ["RENTAL_FEE", "DEPOSIT", "ADVANCE", "BALANCE", "DELIVERY_FEE", "ALTERATION_FEE", "CLEANING_FEE", "LATE_FEE", "DAMAGE_CHARGE"];
const METHODS: TransactionMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "ONLINE", "CHEQUE", "OTHER"];

export function RecordPaymentDialog({ bookingId, suggestedAmount }: { bookingId: string; suggestedAmount: number }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PaymentType>("BALANCE");
  const [method, setMethod] = useState<TransactionMethod>("CARD");
  const [amount, setAmount] = useState(suggestedAmount);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as PaymentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as TransactionMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await recordPayment(bookingId, { type, amount, method });
                if (result?.error) toast.error(result.error);
                else {
                  toast.success("Payment recorded");
                  setOpen(false);
                }
              });
            }}
          >
            {isPending ? "Saving…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
