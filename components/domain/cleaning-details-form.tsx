"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateCleaningDetails } from "@/lib/actions/job-actions";

export function CleaningDetailsForm({ jobId, initialCost, initialNotes }: { jobId: string; initialCost: number; initialNotes: string }) {
  const [cost, setCost] = useState(initialCost || "");
  const [notes, setNotes] = useState(initialNotes);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateCleaningDetails(jobId, { cost: cost === "" ? 0 : Number(cost), notes });
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Saved");
        setDirty(false);
      }
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[7rem_1fr_auto] sm:items-end">
      <div className="space-y-1">
        <Label htmlFor={`cost-${jobId}`} className="text-xs">
          Cost (AED)
        </Label>
        <Input
          id={`cost-${jobId}`}
          type="number"
          value={cost}
          onChange={(e) => {
            setCost(e.target.value === "" ? "" : Number(e.target.value));
            setDirty(true);
          }}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`notes-${jobId}`} className="text-xs">
          Cleaner Notes
        </Label>
        <Textarea
          id={`notes-${jobId}`}
          rows={1}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
        />
      </div>
      <Button size="sm" variant="outline" disabled={!dirty || isPending} onClick={save}>
        <Save className="size-4" /> {isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
