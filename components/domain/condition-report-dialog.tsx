"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { createConditionReport } from "@/lib/actions/condition-report-actions";
import { CONDITION_REPORT_TYPES, DAMAGE_CATEGORIES } from "@/lib/validations/condition-report";
import { enumLabel } from "@/lib/format-enum";
import { cn } from "@/lib/utils";

export function ConditionReportDialog({ garmentId, latestBookingId }: { garmentId: string; latestBookingId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [reportType, setReportType] = useState("POST_RENTAL");
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  }

  function onSubmit(formData: FormData) {
    formData.set("reportType", reportType);
    for (const category of selectedCategories) {
      formData.append("damageCategories", category);
    }

    startTransition(async () => {
      const result = await createConditionReport(garmentId, {}, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Inspection logged");
      setOpen(false);
      setSelectedCategories([]);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardCheck className="size-4" /> New Inspection
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a Condition Inspection</DialogTitle>
          <DialogDescription>
            Scoring this garment and flagging any damage moves it into the repair or cleaning queue automatically.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={onSubmit} className="space-y-4">
          {latestBookingId && <input type="hidden" name="bookingId" value={latestBookingId} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Inspection Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_REPORT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {enumLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conditionScore">Condition Score (0–10)</Label>
              <Input id="conditionScore" name="conditionScore" type="number" min={0} max={10} step={0.1} defaultValue={10} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Damage Found</Label>
            <div className="flex flex-wrap gap-2">
              {DAMAGE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    selectedCategories.includes(category)
                      ? "border-risk-unsafe bg-risk-unsafe/15 text-risk-unsafe"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {enumLabel(category)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="estimatedCost">Estimated Repair Cost</Label>
              <Input id="estimatedCost" name="estimatedCost" type="number" min={0} step={0.01} defaultValue={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo">Photo (optional)</Label>
              <Input id="photo" name="photo" type="file" accept="image/*" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Notes</Label>
            <Textarea id="description" name="description" rows={2} placeholder="What did the inspection find?" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save Inspection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
