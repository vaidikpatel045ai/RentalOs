import Image from "next/image";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { Shirt } from "lucide-react";
import type { Priority } from "@prisma/client";
import { cn } from "@/lib/utils";

/** Garment photo, or a shirt icon when there isn't one. */
export function JobThumb({ imageUrl, alt }: { imageUrl: string | null; alt: string }) {
  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
      {imageUrl ? (
        <Image src={imageUrl} alt={alt} fill sizes="64px" className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <Shirt className="size-6" />
        </div>
      )}
    </div>
  );
}

export type DueState = "done" | "overdue" | "today" | "soon" | "later" | "none";

export function dueState(dueAt: Date | null, completed: boolean): DueState {
  if (completed) return "done";
  if (!dueAt) return "none";
  if (isToday(dueAt)) return "today";
  if (isPast(dueAt)) return "overdue";
  if (isTomorrow(dueAt)) return "soon";
  return "later";
}

const chip = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium";

export function DueChip({ dueAt, state }: { dueAt: Date | null; state: DueState }) {
  if (state === "none") return <span className={cn(chip, "bg-muted text-muted-foreground")}>No due date</span>;
  if (state === "done") return <span className={cn(chip, "bg-risk-safe/12 text-risk-safe")}>Done</span>;
  const label =
    state === "overdue"
      ? `Overdue · ${format(dueAt!, "d MMM")}`
      : state === "today"
        ? "Due today"
        : state === "soon"
          ? "Due tomorrow"
          : `Due ${format(dueAt!, "EEE d MMM")}`;
  return (
    <span
      className={cn(
        chip,
        state === "overdue" && "bg-risk-unsafe/12 text-risk-unsafe",
        state === "today" && "bg-risk-tight/15 text-risk-tight",
        (state === "soon" || state === "later") && "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

const PRIORITY_LABEL: Record<Priority, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };

export function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        chip,
        "border border-border bg-card",
        priority === "URGENT" && "border-risk-unsafe/30 text-risk-unsafe",
        priority === "HIGH" && "border-risk-tight/40 text-risk-tight",
        (priority === "LOW" || priority === "MEDIUM") && "text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          priority === "URGENT" ? "bg-risk-unsafe" : priority === "HIGH" ? "bg-risk-tight" : "bg-muted-foreground/50"
        )}
      />
      {PRIORITY_LABEL[priority]} priority
    </span>
  );
}

/** A thin colored edge on cards that need attention first. */
export function urgencyEdge(state: DueState, priority: Priority): string {
  if (state === "overdue" || (priority === "URGENT" && state !== "done")) return "border-l-4 border-l-risk-unsafe";
  if (state === "today") return "border-l-4 border-l-risk-tight";
  return "";
}
