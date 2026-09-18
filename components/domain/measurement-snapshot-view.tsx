import { format } from "date-fns";
import { Ruler } from "lucide-react";
import { MEASUREMENT_FIELDS, MEASUREMENT_LABELS, type MeasurementSnapshot } from "@/lib/measurements";
import { cn } from "@/lib/utils";

export function MeasurementSnapshotView({
  snapshot,
  className,
  compact = false,
}: {
  snapshot: MeasurementSnapshot | null;
  className?: string;
  compact?: boolean;
}) {
  if (!snapshot || Object.keys(snapshot.values).length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>No measurements on file for this customer yet.</p>
    );
  }

  const entries = MEASUREMENT_FIELDS.filter((f) => snapshot.values[f] !== undefined);

  return (
    <div className={className}>
      {!compact && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Ruler className="size-3.5" />
          <span>
            Version {snapshot.version} · {snapshot.unit} · taken {format(new Date(snapshot.takenAt), "d MMM yyyy")}
            {snapshot.verified ? " · verified" : ""}
          </span>
        </div>
      )}
      <div className={cn("grid gap-x-4 gap-y-1.5", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
        {entries.map((field) => (
          <div key={field} className="min-w-0">
            <p className="truncate text-[11px] text-muted-foreground">{MEASUREMENT_LABELS[field]}</p>
            <p className="text-sm font-medium">
              {snapshot.values[field]} {snapshot.unit}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
