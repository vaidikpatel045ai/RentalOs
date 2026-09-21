"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { togglePackageActive } from "@/lib/actions/package-actions";

export function PackageActiveToggle({ packageId, isActive }: { packageId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          try {
            await togglePackageActive(packageId, checked);
            toast.success(checked ? "Package activated" : "Package deactivated");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update package");
          }
        });
      }}
    />
  );
}
