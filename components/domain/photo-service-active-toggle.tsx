"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { togglePhotoServiceActive } from "@/lib/actions/photography-actions";

export function PhotoServiceActiveToggle({ serviceId, isActive, name }: { serviceId: string; isActive: boolean; name: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      aria-label={`${name} offered`}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          const result = await togglePhotoServiceActive(serviceId, checked);
          if (result?.error) toast.error(result.error);
          else {
            toast.success(checked ? `${name} is offered again` : `${name} is no longer offered`);
            router.refresh();
          }
        });
      }}
    />
  );
}
