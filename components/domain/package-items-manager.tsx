"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addPackageItem, removePackageItem } from "@/lib/actions/package-actions";
import { GARMENT_CATEGORIES } from "@/lib/validations/garment";
import { enumLabel } from "@/lib/format-enum";
import type { PackageItem } from "@prisma/client";

const NO_CATEGORY = "__none__";

export function PackageItemsManager({ packageId, items }: { packageId: string; items: PackageItem[] }) {
  const [category, setCategory] = useState(NO_CATEGORY);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function onAdd(formData: FormData) {
    if (category !== NO_CATEGORY) formData.set("garmentCategory", category);
    startTransition(async () => {
      const result = await addPackageItem(packageId, {}, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Item added");
      formRef.current?.reset();
      setCategory(NO_CATEGORY);
      router.refresh();
    });
  }

  function onRemove(itemId: string) {
    startTransition(async () => {
      try {
        await removePackageItem(itemId, packageId);
        toast.success("Item removed");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove item");
      }
    });
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">
                  {item.quantity}× {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.garmentCategory ? enumLabel(item.garmentCategory) : "Any category"}
                  {item.notes ? ` · ${item.notes}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => onRemove(item.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={onAdd} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Item Name</Label>
          <Input id="name" name="name" placeholder="e.g. Bridal Gown" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quantity">Qty</Label>
          <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY}>Any category</SelectItem>
              {GARMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {enumLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-4">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" name="notes" placeholder="Optional" />
        </div>
        <Button type="submit" size="sm" disabled={isPending} className="sm:col-span-4 sm:w-fit">
          <Plus className="size-4" /> {isPending ? "Adding…" : "Add Item"}
        </Button>
      </form>
    </div>
  );
}
