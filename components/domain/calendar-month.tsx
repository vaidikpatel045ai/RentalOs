import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/queries/calendar";

const TYPE_DOT: Record<CalendarEvent["type"], string> = {
  appointment: "bg-blue-500",
  fitting: "bg-gold",
  trial: "bg-gold",
  pickup: "bg-risk-safe",
  return: "bg-risk-tight",
};

export function CalendarMonth({ month, events }: { month: Date; events: CalendarEvent[] }) {
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/50 text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(e.date, day));
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-28 border-b border-r border-border p-1.5 last:border-r-0",
                !isSameMonth(day, month) && "bg-muted/30 text-muted-foreground/50"
              )}
            >
              <div className={cn("text-xs", isSameDay(day, today) && "font-bold text-gold")}>{format(day, "d")}</div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    href={e.href}
                    className="flex items-center gap-1 truncate rounded bg-muted px-1 py-0.5 text-[10px] hover:bg-accent"
                    title={e.label}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", TYPE_DOT[e.type])} />
                    <span className="truncate">{e.label}</span>
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
