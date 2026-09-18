import Link from "next/link";
import { AlertTriangle, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtRiskItem } from "@/lib/queries/dashboard";
import { format } from "date-fns";

export function AtRiskPanel({ items }: { items: AtRiskItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <TriangleAlert className="size-4 text-risk-unsafe" />
          At Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No at-risk bookings right now — every upcoming turnaround has enough buffer.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={`${item.garmentId}-${item.currentBookingId}`}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <AlertTriangle
                  className={
                    item.risk === "UNSAFE"
                      ? "mt-0.5 size-4 shrink-0 text-risk-unsafe"
                      : "mt-0.5 size-4 shrink-0 text-risk-tight"
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    <Link href={`/dashboard/garments/${item.garmentId}`} className="hover:underline">
                      {item.garmentSku}
                    </Link>{" "}
                    — {item.garmentName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Return: {format(item.returnDate, "d MMM, HH:mm")} · Next booking{" "}
                    <Link href={`/dashboard/bookings/${item.nextBookingId}`} className="hover:underline">
                      {item.nextBookingNumber}
                    </Link>{" "}
                    starts {format(item.nextBookingStart, "d MMM, HH:mm")}
                  </p>
                  <p
                    className={
                      item.risk === "UNSAFE"
                        ? "mt-1 text-xs font-medium text-risk-unsafe"
                        : "mt-1 text-xs font-medium text-risk-tight"
                    }
                  >
                    {item.reason}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
