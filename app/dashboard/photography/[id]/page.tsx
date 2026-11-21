import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/currency";
import { enumLabel } from "@/lib/format-enum";
import { reachPhotoShoot, shootBalance } from "@/lib/photography";
import { requirePhotographyPage } from "@/lib/photography-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoShootStatusBadge } from "@/components/domain/status-badge";
import { RecordShootPaymentDialog, ShootDeliveryForm, ShootStatusActions } from "@/components/domain/photo-shoot-controls";
import { zonedDate, zonedLongDateTime } from "@/lib/datetime";

export default async function PhotoShootDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePhotographyPage("view");
  if (!(await reachPhotoShoot(user, id))) notFound();

  const shoot = await db.photoShoot.findUniqueOrThrow({
    where: { id },
    include: {
      customer: true,
      photographer: true,
      branch: true,
      service: true,
      booking: { select: { id: true, bookingNumber: true } },
      payments: { orderBy: { paidAt: "desc" }, include: { receivedBy: { select: { name: true } } } },
    },
  });

  const canUpdate = can(user.role, "photography", "update");
  const canTakePayment = can(user.role, "payments", "create") && canUpdate;
  const currency = shoot.branch.currency;
  const tz = shoot.branch.timezone;
  const total = Math.max(0, Number(shoot.price) - Number(shoot.discount));
  const balance = shootBalance(shoot);
  const isOpen = shoot.status !== "DELIVERED" && shoot.status !== "CANCELLED";

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl">{shoot.shootNumber}</h1>
            <PhotoShootStatusBadge status={shoot.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {shoot.service?.name ?? enumLabel(shoot.type)} for{" "}
            <Link href={`/dashboard/customers/${shoot.customerId}`} className="text-foreground hover:underline">
              {shoot.customer.firstName} {shoot.customer.lastName}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canUpdate && (
            <ShootStatusActions shootId={shoot.id} status={shoot.status} canCancel={canUpdate} hasGallery={Boolean(shoot.galleryUrl)} />
          )}
          {canUpdate && isOpen && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/photography/${shoot.id}/edit`}>
                <Pencil className="size-3.5" /> Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {shoot.status === "REQUESTED" && (
        <div className="rounded-lg border border-risk-tight/40 bg-risk-tight/10 px-4 py-3 text-sm">
          The client asked for this shoot from their portal. Check the date with them, assign a photographer under Edit, then confirm the booking.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Shoot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label={shoot.status === "REQUESTED" ? "Preferred date" : "Date & time"} value={zonedLongDateTime(shoot.scheduledAt, tz)} />
              <Field label="Duration" value={`${shoot.durationMinutes} minutes`} />
              <Field label="Type" value={enumLabel(shoot.type)} />
              <Field label="Location" value={shoot.location ?? "Not set yet"} />
              <Field label="Photographer" value={shoot.photographer?.name ?? "Not assigned"} />
              <Field label="Branch" value={shoot.branch.name} />
              {shoot.booking && (
                <div>
                  <p className="text-xs text-muted-foreground">Rental booking</p>
                  <Link href={`/dashboard/bookings/${shoot.booking.id}`} className="text-sm font-medium hover:underline">
                    {shoot.booking.bookingNumber}
                  </Link>
                </div>
              )}
              {shoot.service?.deliverables && <Field label="Includes" value={shoot.service.deliverables} />}
              {shoot.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-line text-sm">{shoot.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shoot.galleryUrl && (
                <a href={shoot.galleryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
                  Open gallery <ExternalLink className="size-3.5" />
                </a>
              )}
              {shoot.deliveredAt && <p className="text-sm text-muted-foreground">Delivered {zonedDate(shoot.deliveredAt, tz)}</p>}
              {canUpdate && shoot.status !== "CANCELLED" ? (
                <ShootDeliveryForm shootId={shoot.id} galleryUrl={shoot.galleryUrl} photographerNotes={shoot.photographerNotes} />
              ) : (
                shoot.photographerNotes && <p className="whitespace-pre-line text-sm">{shoot.photographerNotes}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-heading text-base">Payment</CardTitle>
              {canTakePayment && shoot.status !== "CANCELLED" && <RecordShootPaymentDialog shootId={shoot.id} balance={balance} currency={currency} />}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Price" value={formatMoney(shoot.price, currency)} />
              {Number(shoot.discount) > 0 && <Row label="Discount" value={`− ${formatMoney(shoot.discount, currency)}`} />}
              <Row label="Total" value={formatMoney(total, currency)} strong />
              <Row label="Paid" value={formatMoney(shoot.paidAmount, currency)} />
              <Row label="Balance due" value={formatMoney(balance, currency)} strong highlight={balance > 0} />
              {shoot.payments.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  {shoot.payments.map((p) => (
                    <div key={p.id} className="flex items-baseline justify-between gap-3">
                      <div>
                        <p>{formatMoney(p.amount, currency)}</p>
                        <p className="text-xs text-muted-foreground">
                          {enumLabel(p.method)} · {zonedDate(p.paidAt, tz)}
                          {p.receivedBy ? ` · ${p.receivedBy.name}` : ""}
                        </p>
                      </div>
                      {p.reference && <span className="text-xs text-muted-foreground">{p.reference}</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Name" value={`${shoot.customer.firstName} ${shoot.customer.lastName}`} />
              <Field label="Phone" value={shoot.customer.phone} />
              {shoot.customer.whatsapp && <Field label="WhatsApp" value={shoot.customer.whatsapp} />}
              {shoot.customer.weddingDate && <Field label="Wedding date" value={zonedDate(shoot.customer.weddingDate, tz)} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function Row({ label, value, strong, highlight }: { label: string; value: string; strong?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strong ? "font-medium" : ""} ${highlight ? "text-risk-tight" : ""}`}>{value}</span>
    </div>
  );
}
