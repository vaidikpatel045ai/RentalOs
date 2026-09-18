"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { garmentSchema, GARMENT_CATEGORIES, type GarmentInput } from "@/lib/validations/garment";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Branch } from "@prisma/client";

interface GarmentFormProps {
  branches: Branch[];
  defaultBranchId?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<GarmentInput>;
  submitLabel?: string;
}

export function GarmentForm({ branches, defaultBranchId, action, defaultValues, submitLabel = "Save Garment" }: GarmentFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<GarmentInput>({
    resolver: zodResolver(garmentSchema),
    defaultValues: {
      branchId: defaultBranchId ?? branches[0]?.id ?? "",
      category: "BRIDAL_GOWN",
      rentalPrice: 0,
      securityDeposit: 0,
      purchaseCost: 0,
      replacementValue: 0,
      ...defaultValues,
    },
  });

  function onSubmit(values: GarmentInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      fd.set(key, String(value));
    });
    startTransition(async () => {
      const result = await action({}, fd);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" placeholder="BR-102" {...form.register("sku")} />
          {form.formState.errors.sku && <p className="text-xs text-destructive">{form.formState.errors.sku.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Ivory Silk Mermaid Gown" {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select defaultValue={form.getValues("category")} onValueChange={(v) => form.setValue("category", v as GarmentInput["category"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GARMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Branch</Label>
          <Select defaultValue={form.getValues("branchId")} onValueChange={(v) => form.setValue("branchId", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="designer">Designer</Label>
          <Input id="designer" {...form.register("designer")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="collection">Collection</Label>
          <Input id="collection" {...form.register("collection")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="color">Color</Label>
          <Input id="color" {...form.register("color")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fabric">Fabric</Label>
          <Input id="fabric" {...form.register("fabric")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="size">Size</Label>
          <Input id="size" {...form.register("size")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="year">Year</Label>
          <Input id="year" type="number" {...form.register("year")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="rentalPrice">Rental Price (AED)</Label>
          <Input id="rentalPrice" type="number" step="0.01" {...form.register("rentalPrice")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="securityDeposit">Security Deposit</Label>
          <Input id="securityDeposit" type="number" step="0.01" {...form.register("securityDeposit")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchaseCost">Purchase Cost</Label>
          <Input id="purchaseCost" type="number" step="0.01" {...form.register("purchaseCost")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="replacementValue">Replacement Value</Label>
          <Input id="replacementValue" type="number" step="0.01" {...form.register("replacementValue")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
