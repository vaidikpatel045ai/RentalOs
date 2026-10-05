"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { packageSchema, type PackageInput } from "@/lib/validations/package";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BranchOption {
  id: string;
  name: string;
}

type Intent = NonNullable<PackageInput["intent"]>;

/**
 * `status` is the saved package's state: "new" (not saved yet), "draft" or
 * "published". New packages and drafts can be saved as a draft or published;
 * a published package just saves its changes.
 */
export function PackageForm({
  branches,
  action,
  defaultValues,
  status = "new",
}: {
  branches: BranchOption[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<PackageInput>;
  status?: "new" | "draft" | "published";
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PackageInput>({
    resolver: zodResolver(packageSchema),
    defaultValues: { intent: "publish", branchId: branches[0]?.id ?? "", ...defaultValues },
  });
  const { errors } = form.formState;
  const [pendingIntent, setPendingIntent] = useState<Intent>("publish");

  function submitAs(intent: Intent) {
    setPendingIntent(intent);
    form.setValue("intent", intent);
    form.clearErrors();
    void form.handleSubmit(onSubmit)();
  }

  function onSubmit(values: PackageInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      fd.set(key, String(value));
    });
    startTransition(async () => {
      const result = await action({}, fd);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      // Creating redirects to the edit page; updates come back here.
      if (result) {
        toast.success(
          values.intent === "draft" ? "Draft saved" : status === "draft" ? "Package published" : "Changes saved"
        );
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitAs("publish");
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Package Name</Label>
          <Input id="name" placeholder="Complete Bridal Package" {...form.register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step={0.01}
            placeholder={status === "published" ? undefined : "Can be added later for a draft"}
            {...form.register("price")}
          />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
        {branches.length > 1 && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Branch</Label>
            <Select
              defaultValue={form.getValues("branchId")}
              onValueChange={(v) => form.setValue("branchId", v, { shouldValidate: true })}
            >
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
            {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...form.register("description")} />
      </div>

      <div className="flex flex-wrap gap-2">
        {status === "published" ? (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        ) : (
          <>
            <Button type="submit" disabled={isPending}>
              {isPending && pendingIntent === "publish" ? "Publishing…" : "Publish Package"}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => submitAs("draft")}>
              {isPending && pendingIntent === "draft" ? "Saving…" : status === "draft" ? "Save Draft" : "Save as Draft"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
