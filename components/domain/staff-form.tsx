"use client";

import { useTransition } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createStaffSchema, updateStaffSchema, STAFF_ROLES, type CreateStaffInput, type UpdateStaffInput } from "@/lib/validations/staff";
import type { ActionState } from "@/lib/actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Branch } from "@prisma/client";

// One combined shape for both modes — `password` only applies to create,
// `isActive`/`newPassword` only to edit. Each schema only validates its own
// subset of fields; the resolver is cast below since RHF can't statically
// unify two differently-shaped Zod schemas behind a single form type.
type StaffFormValues = Omit<CreateStaffInput, "password"> &
  Partial<Pick<UpdateStaffInput, "isActive" | "newPassword">> & { password?: string };

export function StaffForm({
  branches,
  action,
  mode,
  defaultValues,
}: {
  branches: Branch[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  mode: "create" | "edit";
  defaultValues?: Partial<StaffFormValues>;
}) {
  const [isPending, startTransition] = useTransition();
  // Each schema is resolved separately (so its own call type-checks against
  // its own shape), then the pair is cast to one shared resolver type.
  const resolver = (mode === "create" ? zodResolver(createStaffSchema) : zodResolver(updateStaffSchema)) as Resolver<StaffFormValues>;
  const form = useForm<StaffFormValues>({
    resolver,
    defaultValues: {
      role: "SALES",
      isActive: true,
      ...defaultValues,
    },
  });
  const isActive = useWatch({ control: form.control, name: "isActive" });

  function onSubmit(values: StaffFormValues) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      fd.set(key, typeof value === "boolean" ? (value ? "on" : "") : String(value));
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
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select defaultValue={form.getValues("role")} onValueChange={(v) => form.setValue("role", v as StaffFormValues["role"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAFF_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Branch</Label>
          <Select
            defaultValue={form.getValues("branchId") ?? undefined}
            onValueChange={(v) => form.setValue("branchId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No branch (all branches)" />
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
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+971501234567" {...form.register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="employeeCode">Employee Code</Label>
          <Input id="employeeCode" placeholder="EMP-010" {...form.register("employeeCode")} />
          {form.formState.errors.employeeCode && (
            <p className="text-xs text-destructive">{form.formState.errors.employeeCode.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Job Title</Label>
          <Input id="title" placeholder="Bridal Stylist" {...form.register("title")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="department">Department</Label>
          <Input id="department" {...form.register("department")} />
        </div>
        {mode === "create" ? (
          <div className="space-y-1.5">
            <Label htmlFor="password">Initial Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password (optional)</Label>
            <Input id="newPassword" type="password" placeholder="Leave blank to keep current password" {...form.register("newPassword")} />
          </div>
        )}
      </div>

      {mode === "edit" && (
        <div className="flex items-center gap-2">
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={(checked) => form.setValue("isActive", checked)}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : mode === "create" ? "Create Staff Member" : "Save Changes"}
      </Button>
    </form>
  );
}
