import { cn } from "@/lib/utils";

/**
 * Where a job is in its workflow, as a segmented bar plus a short caption.
 * Detour statuses (revision, failed QC) are mapped onto a main step by the
 * caller and flagged with `detour`, which turns the current segment amber.
 */
export function JobProgress({
  steps,
  current,
  currentLabel,
  detour,
}: {
  steps: string[];
  /** Index into `steps`; `steps.length` means finished. */
  current: number;
  currentLabel: string;
  detour?: string;
}) {
  const done = current >= steps.length;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" aria-hidden>
        {steps.map((step, i) => (
          <div
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < current || done ? "bg-risk-safe" : i === current ? (detour ? "bg-risk-tight" : "bg-gold") : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {done ? (
          <span className="font-medium text-risk-safe">Completed</span>
        ) : (
          <>
            <span className="font-medium text-foreground">{currentLabel}</span>
            {detour ? <span className="text-risk-tight"> · {detour}</span> : null}
            <span> · Step {current + 1} of {steps.length}</span>
          </>
        )}
        <span className="sr-only">. Steps: {steps.join(", ")}.</span>
      </p>
    </div>
  );
}
