"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { BookingStatus } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateBookingStatus } from "@/lib/actions/payment-actions";
import { BOOKING_STATUSES } from "@/lib/validations/booking";

const STATUSES = BOOKING_STATUSES satisfies readonly BookingStatus[];

export function BookingStatusControl({ bookingId, currentStatus }: { bookingId: string; currentStatus: BookingStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={currentStatus}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          try {
            await updateBookingStatus(bookingId, value as "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED");
            toast.success("Booking status updated");
          } catch {
            toast.error("Could not update status");
          }
        });
      }}
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s.replaceAll("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
