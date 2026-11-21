"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { PhotoShootStatus, TransactionMethod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordShootPayment, setPhotoShootStatus, updateShootDelivery } from "@/lib/actions/photography-actions";
import { enumLabel } from "@/lib/format-enum";

/** The one step forward from each status, worded as what the button does. */
const NEXT_STEP: Partial<Record<PhotoShootStatus, { to: PhotoShootStatus; label: string; done: string }>> = {
  REQUESTED: { to: "BOOKED", label: "Confirm booking", done: "Booking confirmed" },
  BOOKED: { to: "SHOT", label: "Mark as shot", done: "Marked as shot" },
  SHOT: { to: "EDITING", label: "Start editing", done: "Editing started" },
  EDITING: { to: "DELIVERED", label: "Mark photos delivered", done: "Photos delivered" },
};

/**
 * Moves a shoot to its next step. The boutique also gets Cancel; a
 * photographer gets only the steps after booking (shot, editing, delivered).
 */
export function ShootStatusActions({
  shootId,
  status,
  canCancel,
  photographerView = false,
  hasGallery,
}: {
  shootId: string;
  status: PhotoShootStatus;
  canCancel: boolean;
  photographerView?: boolean;
  hasGallery: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const router = useRouter();
  const next = NEXT_STEP[status];
  const showNext = next && !(photographerView && status === "REQUESTED");
  const open = status !== "DELIVERED" && status !== "CANCELLED";

  const move = (to: PhotoShootStatus, done: string) =>
    startTransition(async () => {
      const result = await setPhotoShootStatus(shootId, to);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(done);
        setConfirmCancel(false);
        router.refresh();
      }
    });

  if (!open) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showNext && (
        <Button
          size="sm"
          disabled={isPending || (next.to === "DELIVERED" && !hasGallery)}
          title={next.to === "DELIVERED" && !hasGallery ? "Add the gallery link first" : undefined}
          onClick={() => move(next.to, next.done)}
        >
          {next.label}
        </Button>
      )}
      {next?.to === "DELIVERED" && !hasGallery && <span className="text-xs text-muted-foreground">Add the gallery link first.</span>}
      {canCancel && (
        <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={isPending}>
              {status === "REQUESTED" ? "Decline request" : "Cancel shoot"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{status === "REQUESTED" ? "Decline this request?" : "Cancel this shoot?"}</DialogTitle>
              <DialogDescription>
                It stays in the list as cancelled, with any payments already taken. Refund those separately if needed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmCancel(false)} disabled={isPending}>
                Keep it
              </Button>
              <Button variant="destructive" disabled={isPending} onClick={() => move("CANCELLED", "Shoot cancelled")}>
                {status === "REQUESTED" ? "Decline request" : "Cancel shoot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/** Gallery link and editing notes: filled in by the photographer, visible to the boutique. */
export function ShootDeliveryForm({
  shootId,
  galleryUrl,
  photographerNotes,
}: {
  shootId: string;
  galleryUrl: string | null;
  photographerNotes: string | null;
}) {
  const [url, setUrl] = useState(galleryUrl ?? "");
  const [notes, setNotes] = useState(photographerNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = url !== (galleryUrl ?? "") || notes !== (photographerNotes ?? "");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updateShootDelivery(shootId, { galleryUrl: url, photographerNotes: notes });
          if (result?.error) toast.error(result.error);
          else {
            toast.success("Saved");
            router.refresh();
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`gallery-${shootId}`}>Gallery link</Label>
        <Input
          id={`gallery-${shootId}`}
          type="url"
          inputMode="url"
          placeholder="https://drive.google.com/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Where the client collects the finished photos. They see it once you mark the photos delivered.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`pnotes-${shootId}`}>Photographer notes</Label>
        <Textarea id={`pnotes-${shootId}`} rows={2} placeholder="Editing progress, number of photos…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isPending || !dirty}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

const METHODS: TransactionMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "ONLINE", "CHEQUE", "OTHER"];

export function RecordShootPaymentDialog({ shootId, balance, currency }: { shootId: string; balance: number; currency: string }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<TransactionMethod>("CARD");
  const [amount, setAmount] = useState(String(balance));
  const [reference, setReference] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setAmount(String(balance));
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={balance <= 0}>
          <Plus className="size-4" /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Balance due: {currency} {balance.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="shoot-pay-amount">Amount ({currency})</Label>
            <Input id="shoot-pay-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
                    {enumLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shoot-pay-ref">Reference (optional)</Label>
            <Input id="shoot-pay-ref" placeholder="Receipt or transfer number" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => {
              const fd = new FormData();
              fd.set("amount", amount);
              fd.set("method", method);
              fd.set("reference", reference);
              startTransition(async () => {
                const result = await recordShootPayment(shootId, {}, fd);
                if (result?.error) toast.error(result.error);
                else {
                  toast.success("Payment recorded");
                  setOpen(false);
                  setReference("");
                  router.refresh();
                }
              });
            }}
          >
            {isPending ? "Saving…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
