"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { createDamageCharge } from "@/lib/actions/condition-report-actions";

export function DamageChargeDialog({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createDamageCharge({}, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Damage charge added");
      setOpen(false);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> Add Charge
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Damage Charge</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={onSubmit} className="space-y-4">
          <input type="hidden" name="bookingId" value={bookingId} />
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" placeholder="e.g. Stain on sleeve" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" min={0.01} step={0.01} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Notes</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Add Charge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
