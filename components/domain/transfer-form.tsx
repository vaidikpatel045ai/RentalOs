"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { transferSchema, type TransferInput } from "@/lib/validations/transfer";
import { requestTransfer } from "@/lib/actions/transfer-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Branch, Garment } from "@prisma/client";

export function TransferForm({ garments, branches }: { garments: (Garment & { branch: Branch })[]; branches: Branch[] }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<TransferInput>({ resolver: zodResolver(transferSchema) });
  const [selectedGarmentId, setSelectedGarmentId] = useState<string | undefined>();
  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  function onSubmit(values: TransferInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      fd.set(key, String(value));
    });
    startTransition(async () => {
      const result = await requestTransfer({}, fd);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Garment</Label>
        <Select
          onValueChange={(v) => {
            form.setValue("garmentId", v);
            setSelectedGarmentId(v);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a garment" />
          </SelectTrigger>
          <SelectContent>
            {garments.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.sku} — {g.name} ({g.branch.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.garmentId && (
          <p className="text-xs text-destructive">{form.formState.errors.garmentId.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Destination Branch</Label>
        <Select onValueChange={(v) => form.setValue("toBranchId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a branch" />
          </SelectTrigger>
          <SelectContent>
            {branches
              .filter((b) => b.id !== selectedGarment?.branchId)
              .map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {form.formState.errors.toBranchId && (
          <p className="text-xs text-destructive">{form.formState.errors.toBranchId.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} placeholder="Why is this garment moving branches?" {...form.register("notes")} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Requesting…" : "Request Transfer"}
      </Button>
    </form>
  );
}
