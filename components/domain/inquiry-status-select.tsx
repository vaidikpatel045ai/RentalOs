"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { InquiryStatus } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateInquiryStatus } from "@/lib/actions/inquiry-actions";
import { enumLabel } from "@/lib/format-enum";

const INQUIRY_STATUSES: InquiryStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO_SCHEDULED",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export function InquiryStatusSelect({ inquiryId, status }: { inquiryId: string; status: InquiryStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          const result = await updateInquiryStatus(inquiryId, value as InquiryStatus);
          if (result?.error) toast.error(result.error);
          else toast.success("Status updated");
        });
      }}
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {INQUIRY_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {enumLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
