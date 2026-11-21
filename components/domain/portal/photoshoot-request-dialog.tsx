"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { requestPhotoShoot } from "@/lib/actions/photography-actions";
import { cn } from "@/lib/utils";

export interface RequestableService {
  id: string;
  name: string;
  price: string;
  durationMinutes: number;
  deliverables: string | null;
  description: string | null;
}

/** The client picks a shoot and a preferred date; the boutique confirms it. */
export function PhotoshootRequestDialog({ services }: { services: RequestableService[] }) {
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [preferredAt, setPreferredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Camera className="size-4" /> Request a photoshoot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a photoshoot</DialogTitle>
          <DialogDescription>Choose a shoot and a date that suits you. The boutique will confirm the time with you.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!preferredAt) {
              toast.error("Pick a preferred date and time");
              return;
            }
            const fd = new FormData();
            fd.set("serviceId", serviceId);
            fd.set("preferredAt", new Date(preferredAt).toISOString());
            fd.set("notes", notes);
            startTransition(async () => {
              const result = await requestPhotoShoot({}, fd);
              if (result?.error) toast.error(result.error);
              else {
                toast.success("Request sent. The boutique will be in touch.");
                setOpen(false);
                setNotes("");
                setPreferredAt("");
                router.refresh();
              }
            });
          }}
        >
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Shoot</legend>
            {services.map((s) => (
              <label
                key={s.id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors",
                  serviceId === s.id ? "border-foreground/60 bg-muted/50" : "border-border hover:border-foreground/30"
                )}
              >
                <input type="radio" name="serviceId" value={s.id} checked={serviceId === s.id} onChange={() => setServiceId(s.id)} className="mt-1" />
                <span className="min-w-0 space-y-0.5">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium">{s.name}</span>
                    <span className="tabular-nums">{s.price}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {Math.round((s.durationMinutes / 60) * 10) / 10} hours{s.deliverables ? ` · ${s.deliverables}` : ""}
                  </span>
                  {s.description && <span className="block text-xs text-muted-foreground">{s.description}</span>}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="preferredAt">Preferred date & time</Label>
            <Input id="preferredAt" type="datetime-local" value={preferredAt} onChange={(e) => setPreferredAt(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shoot-notes">Anything we should know? (optional)</Label>
            <Textarea id="shoot-notes" rows={3} placeholder="Location ideas, outfits, who's in the photos…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !serviceId}>
              {isPending ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
