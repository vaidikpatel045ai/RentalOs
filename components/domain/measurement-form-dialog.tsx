"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { measurementSchema, type MeasurementInput } from "@/lib/validations/customer";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

const FIELDS: { key: keyof MeasurementInput; label: string }[] = [
  { key: "bust", label: "Bust" },
  { key: "underbust", label: "Underbust" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hip" },
  { key: "shoulder", label: "Shoulder" },
  { key: "armhole", label: "Armhole" },
  { key: "sleeve", label: "Sleeve" },
  { key: "bicep", label: "Bicep" },
  { key: "blouseLength", label: "Blouse Length" },
  { key: "frontLength", label: "Front Length" },
  { key: "backLength", label: "Back Length" },
  { key: "hollowToHem", label: "Hollow to Hem" },
  { key: "height", label: "Height" },
  { key: "heelHeight", label: "Heel Height" },
  { key: "lehengaWaist", label: "Lehenga Waist" },
  { key: "lehengaLength", label: "Lehenga Length" },
  { key: "trainLength", label: "Train Length" },
];

export function MeasurementFormDialog({
  customerId,
  action,
}: {
  customerId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<MeasurementInput>({
    resolver: zodResolver(measurementSchema),
    defaultValues: { customerId, unit: "cm", verified: false },
  });

  function onSubmit(values: MeasurementInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      fd.set(key, typeof value === "boolean" ? (value ? "on" : "") : String(value));
    });
    startTransition(async () => {
      const result = await action({}, fd);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Measurement saved");
        setOpen(false);
        form.reset();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" /> Add Measurement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Measurement Set</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={f.key} className="text-xs">
                  {f.label} (cm)
                </Label>
                <Input id={f.key} type="number" step="0.1" {...form.register(f.key)} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save Measurements"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
