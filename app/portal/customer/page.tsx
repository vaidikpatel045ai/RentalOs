import Image from "next/image";
import { differenceInCalendarDays } from "date-fns";
import { CalendarClock, Download, FileText, Phone, Ruler, Shirt } from "lucide-react";
import type { BookingStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { InvoicePreviewDialog } from "@/components/domain/invoice-preview-dialog";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/domain/status-badge";
import { PortalGreeting } from "@/components/domain/portal/portal-job-board";
import { formatMoney } from "@/lib/currency";
import { MEASUREMENT_FIELDS, MEASUREMENT_LABELS } from "@/lib/measurements";
import { enumLabel } from "@/lib/format-enum";

/** Formats in the boutique's own timezone, so a 3pm fitting reads 3pm wherever the server runs. */
function formatter(timezone: string, options: Intl.DateTimeFormatOptions) {
  const f = new Intl.DateTimeFormat("en-GB", { ...options, timeZone: timezone });
  return (d: Date) => f.format(d);
}

/** Matches what the invoice route lets a customer open. */
const INVOICE_STATUSES: BookingStatus[] = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"];

function KeyDate({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

export default async function CustomerPortalPage() {
  const session = await auth();
  const customer = await db.customer.findUnique({
    where: { userId: session?.user.id },
    include: {
      branch: { select: { name: true, phone: true, timezone: true } },
      bookings: {
        include: {
          items: {
            include: { garment: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
          },
          branch: { select: { name: true, phone: true, currency: true } },
          // Only deposit payments: they're shown apart from what's been paid on the booking.
          payments: { where: { status: "COMPLETED", type: "DEPOSIT" }, select: { amount: true } },
        },
        orderBy: { rentalStart: "desc" },
      },
      appointments: {
        where: { scheduledAt: { gte: new Date() }, status: { not: "CANCELLED" } },
        include: { branch: { select: { name: true } } },
        orderBy: { scheduledAt: "asc" },
      },
      measurements: { where: { isLatest: true }, take: 1 },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
        Your account isn&apos;t linked to a customer profile yet. Please ask the boutique to connect it.
      </div>
    );
  }

  const tz = customer.branch.timezone || "Asia/Dubai";
  const day = formatter(tz, { day: "numeric", month: "short", year: "numeric" });
  const dayShort = formatter(tz, { weekday: "short", day: "numeric", month: "short" });
  const time = formatter(tz, { hour: "numeric", minute: "2-digit", hour12: true });
  const monthShort = formatter(tz, { month: "short" });
  const dayNum = formatter(tz, { day: "numeric" });

  const upcomingWedding = customer.weddingDate && differenceInCalendarDays(customer.weddingDate, new Date());
  const summary =
    upcomingWedding && upcomingWedding > 0
      ? `${upcomingWedding} day${upcomingWedding === 1 ? "" : "s"} until your big day on ${dayShort(customer.weddingDate!)}.`
      : customer.bookings.length > 0
        ? "Your bookings, fittings and measurements, all in one place."
        : "Your bookings will appear here once the boutique confirms them.";

  const measurement = customer.measurements[0];
  const hasSidebar = customer.appointments.length > 0 || measurement || customer.documents.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalGreeting name={customer.firstName} timezone={tz} title="Welcome back" summary={summary} />

      <div className={hasSidebar ? "grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" : "space-y-6"}>
        {/* On phones the next fitting is the most time-sensitive thing, so the sidebar comes first. */}
        {hasSidebar && (
          <div className="space-y-6 lg:order-2">
            {customer.appointments.length > 0 && (
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-base">
                    <CalendarClock className="size-4 text-muted-foreground" />
                    Upcoming appointments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {customer.appointments.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-md bg-gold/12 text-gold">
                        <span className="text-[10px] font-medium uppercase leading-none">{monthShort(a.scheduledAt)}</span>
                        <span className="font-heading text-lg leading-tight">{dayNum(a.scheduledAt)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{enumLabel(a.type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {dayShort(a.scheduledAt)}, {time(a.scheduledAt)} · {a.branch.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {measurement && (
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-base">
                    <Ruler className="size-4 text-muted-foreground" />
                    Your measurements
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Taken {day(measurement.takenAt)}
                    {measurement.verified ? " · verified by the boutique" : ""}
                  </p>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-2">
                    {MEASUREMENT_FIELDS.map((field) => {
                      const value = measurement[field];
                      if (value === null || value === undefined) return null;
                      return (
                        <div key={field}>
                          <dt className="text-xs text-muted-foreground">{MEASUREMENT_LABELS[field]}</dt>
                          <dd className="text-sm font-medium">
                            {String(value)} {measurement.unit}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </CardContent>
              </Card>
            )}

            {customer.documents.length > 0 && (
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-base">
                    <FileText className="size-4 text-muted-foreground" />
                    Your documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {customer.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent"
                    >
                      <span className="min-w-0 truncate">{doc.fileName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{enumLabel(doc.type)}</span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <section className="space-y-4 lg:order-1" data-tour="page-content">
          <h2 className="font-heading text-lg">Your bookings</h2>
          {customer.bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
              No bookings yet. Once the boutique confirms one, you&apos;ll see the dates and payments here.
            </div>
          ) : (
            customer.bookings.map((b) => {
              const total = Number(b.totalAmount);
              const paid = Number(b.paidAmount);
              const balance = Number(b.balanceDue);
              const depositAmount = Number(b.depositAmount);
              const depositReceived = b.payments.reduce((sum, p) => sum + Number(p.amount), 0);
              const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
              const garments = b.items.map((i) => i.garment);
              return (
                <Card key={b.id} className="gap-0 overflow-hidden py-0">
                  <div className="flex gap-3 p-4 sm:gap-4 sm:p-5">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:size-20">
                      {garments[0]?.images[0]?.url ? (
                        <Image src={garments[0].images[0].url} alt={garments[0].name} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Shirt className="size-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <h3 className="min-w-0 font-heading text-lg leading-snug">{garments.map((g) => g.name).join(", ")}</h3>
                        <BookingStatusBadge status={b.status} className="shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{b.bookingNumber}</span> · {b.branch.name}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-border px-4 py-4 sm:grid-cols-4 sm:px-5">
                    <KeyDate label="Rental" value={`${dayShort(b.rentalStart)} – ${dayShort(b.rentalEnd)}`} />
                    <KeyDate label="Pickup" value={b.pickupDate ? dayShort(b.pickupDate) : dayShort(b.rentalStart)} />
                    <KeyDate label="Return by" value={dayShort(b.returnDate ?? b.rentalEnd)} />
                    {b.weddingDate ? <KeyDate label="Wedding" value={dayShort(b.weddingDate)} /> : null}
                  </div>

                  <div className="space-y-2 border-t border-border bg-muted/30 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <PaymentStatusBadge status={b.paymentStatus} />
                      <p className="text-sm">
                        {balance > 0 ? (
                          <>
                            <span className="font-semibold">{formatMoney(balance, b.branch.currency)}</span>
                            <span className="text-muted-foreground"> still due</span>
                          </>
                        ) : (
                          <span className="font-medium text-risk-safe">Paid in full</span>
                        )}
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className="h-full rounded-full bg-risk-safe" style={{ width: `${paidPct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(paid, b.branch.currency)} paid of {formatMoney(total, b.branch.currency)}
                    </p>
                    {depositAmount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Refundable security deposit {formatMoney(depositAmount, b.branch.currency)}:{" "}
                        {depositReceived >= depositAmount
                          ? "received, returned after the garments come back"
                          : depositReceived > 0
                            ? `${formatMoney(depositReceived, b.branch.currency)} received, the rest due at pickup`
                            : "due at pickup"}
                        .
                      </p>
                    )}
                    {balance > 0 && b.branch.phone && (
                      <a
                        href={`tel:${b.branch.phone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        <Phone className="size-3.5" /> Call {b.branch.name} about payment
                      </a>
                    )}
                  </div>

                  {INVOICE_STATUSES.includes(b.status) && (
                    <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <p className="text-xs text-muted-foreground">Your invoice is always up to date with your latest payments.</p>
                      <div className="grid grid-cols-2 gap-2 sm:flex">
                        <InvoicePreviewDialog bookingId={b.id} bookingNumber={b.bookingNumber} label="View invoice" />
                        <Button asChild variant="outline" size="sm">
                          <a href={`/api/bookings/${b.id}/invoice?download=1`} download>
                            <Download className="size-4" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
