"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setOrganizationPhotography } from "@/lib/actions/organization-actions";

/** Platform admin: optional modules a boutique can be given. */
export function OrganizationServicesPanel({ organizationId, photographyEnabled }: { organizationId: string; photographyEnabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <Camera className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <Label htmlFor="photography-enabled" className="text-sm font-medium">
            Photography services
          </Label>
          <p className="text-xs text-muted-foreground">
            Pre-wedding, bridal and other shoots, with a photographer portal. Turning it off hides it from the boutique but keeps
            their shoots and payments.
          </p>
        </div>
      </div>
      <Switch
        id="photography-enabled"
        checked={photographyEnabled}
        disabled={isPending}
        onCheckedChange={(checked) => {
          startTransition(async () => {
            try {
              await setOrganizationPhotography(organizationId, checked);
              toast.success(checked ? "Photography services switched on" : "Photography services switched off");
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update services");
            }
          });
        }}
      />
    </div>
  );
}
