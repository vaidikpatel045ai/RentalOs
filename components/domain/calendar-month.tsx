"use client";

import { useState } from "react";
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
import { ArrowLeft, CalendarDays, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CalendarEvent } from "@/lib/queries/calendar";

const TYPE_DOT: Record<CalendarEvent["type"], string> = {
  appointment: "bg-blue-500",
  fitting: "bg-gold",
  trial: "bg-gold",
  pickup: "bg-risk-safe",
  return: "bg-risk-tight",
};

// What the pop-up is showing: a whole day, or one event (optionally opened
// from a day, so "Back" can return there).
type Selection = { day: Date; eventId: string | null; fromDay: boolean } | null;

export function CalendarMonth({ month, events }: { month: Date; events: CalendarEvent[] }) {
  const [selection, setSelection] = useState<Selection>(null);
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  const dayEvents = (day: Date) => events.filter((e) => isSameDay(e.date, day));
  const selectedEvent = selection?.eventId ? events.find((e) => e.id === selection.eventId) : undefined;

  return (
    <>
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
            const list = dayEvents(day);
            return (
              <div
                key={day.toISOString()}
                role="button"
                tabIndex={0}
                aria-label={`${format(day, "EEEE d MMMM")}, ${list.length} events`}
                onClick={() => setSelection({ day, eventId: null, fromDay: false })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelection({ day, eventId: null, fromDay: false });
                  }
                }}
                className={cn(
                  "min-h-20 cursor-pointer border-b border-r border-border p-1.5 transition-colors last:border-r-0 hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none sm:min-h-28",
                  !isSameMonth(day, month) && "bg-muted/30 text-muted-foreground/50"
                )}
              >
                <div className={cn("text-xs", isSameDay(day, today) && "font-bold text-gold")}>{format(day, "d")}</div>
                <div className="mt-1 space-y-0.5">
                  {list.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelection({ day, eventId: e.id, fromDay: false });
                      }}
                      className="flex w-full items-center gap-1 truncate rounded bg-muted px-1 py-0.5 text-left text-[10px] hover:bg-accent"
                      title={e.label}
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", TYPE_DOT[e.type])} />
                      <span className="hidden truncate sm:inline">{e.label}</span>
                    </button>
                  ))}
                  {list.length > 3 && <p className="px-1 text-[10px] text-muted-foreground">+{list.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={selection !== null} onOpenChange={(open) => !open && setSelection(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selection && selectedEvent ? (
            <EventDetails
              event={selectedEvent}
              onBack={selection.fromDay ? () => setSelection({ ...selection, eventId: null, fromDay: false }) : undefined}
            />
          ) : selection ? (
            <DayList
              day={selection.day}
              events={dayEvents(selection.day)}
              onOpen={(id) => setSelection({ day: selection.day, eventId: id, fromDay: true })}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DayList({ day, events, onOpen }: { day: Date; events: CalendarEvent[]; onOpen: (id: string) => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading">{format(day, "EEEE, d MMMM yyyy")}</DialogTitle>
        <DialogDescription>
          {events.length === 0 ? "Nothing scheduled this day." : `${events.length} scheduled — click one for full details.`}
        </DialogDescription>
      </DialogHeader>
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
          <CalendarDays className="size-6" />
          No appointments, pickups or returns.
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onOpen(e.id)}
              className="flex w-full items-start gap-3 rounded-md border border-border p-3 text-left hover:bg-accent"
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TYPE_DOT[e.type])} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{e.details.customerName}</span>
                <span className="block text-xs text-muted-foreground">
                  {e.details.kind} · {e.details.subtype} · {e.details.branchName}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{format(e.date, "HH:mm")}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function EventDetails({ event, onBack }: { event: CalendarEvent; onBack?: () => void }) {
  const d = event.details;
  return (
    <>
      <DialogHeader>
        {onBack && (
          <button type="button" onClick={onBack} className="mb-1 flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to {format(event.date, "d MMM")}
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", TYPE_DOT[event.type])} />
          <span className="text-xs font-medium text-muted-foreground">{d.kind}</span>
          <Badge variant="secondary" className="font-normal">
            {d.status}
          </Badge>
        </div>
        <DialogTitle className="font-heading">{d.customerName}</DialogTitle>
        <DialogDescription>
          {format(event.date, "EEEE, d MMMM yyyy · HH:mm")}
          {d.durationMinutes ? ` · ${d.durationMinutes} min` : ""}
        </DialogDescription>
      </DialogHeader>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Detail label="Type" value={d.subtype} />
        <Detail label="Branch" value={d.branchName} />
        <Detail label="Staff" value={d.staffName} />
        <Detail label="Room" value={d.room} />
        <Detail label="Booking" value={d.bookingNumber} />
        <Detail label="Payment" value={d.paymentStatus} />
        <Detail label="Total" value={d.totalAmount} />
        <Detail label="Balance due" value={d.balanceDue} />
        {d.rentalWindow && (
          <Detail
            label="Rental window"
            value={`${format(new Date(d.rentalWindow.start), "d MMM")} – ${format(new Date(d.rentalWindow.end), "d MMM yyyy")}`}
          />
        )}
        {d.customerPhone && (
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd>
              <a href={`tel:${d.customerPhone}`} className="inline-flex items-center gap-1 font-medium hover:underline">
                <Phone className="size-3" /> {d.customerPhone}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {d.garments.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground">Garments</p>
          <ul className="mt-1 space-y-1 text-sm">
            {d.garments.map((g) => (
              <li key={g} className="rounded-md bg-muted px-2 py-1">
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.notes && (
        <div>
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{d.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {d.bookingHref && (
          <Button asChild size="sm">
            <Link href={d.bookingHref}>Open booking</Link>
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <Link href={d.customerHref}>Customer profile</Link>
        </Button>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
