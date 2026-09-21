import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentStatusBadge, GarmentStatusBadge } from "@/components/domain/status-badge";
import { BookingStatusControl } from "@/components/domain/booking-status-control";
import { RecordPaymentDialog } from "@/components/domain/record-payment-dialog";
import { DamageChargeDialog } from "@/components/domain/damage-charge-dialog";
import { DamageChargeActions } from "@/components/domain/damage-charge-actions";
import { DocumentsList } from "@/components/domain/documents-list";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [booking, documents] = await Promise.all([
    db.booking.findUnique({
      where: { id },
      include: {
        branch: true,
        customer: true,
        items: { include: { garment: true } },
        events: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { paidAt: "desc" } },
        deposits: true,
        damageCharges: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.document.findMany({ where: { bookingId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!booking) notFound();

  const session = await auth();
  const canManageDamage = Boolean(session?.user && can(session.user.role, "conditionReports", "create"));
  const canApproveDamage = Boolean(session?.user && can(session.user.role, "conditionReports", "update"));
  const canManageDocuments = Boolean(session?.user && can(session.user.role, "documents", "create"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{booking.bookingNumber}</p>
          <h1 className="font-heading text-2xl">
            <Link href={`/dashboard/customers/${booking.customerId}`} className="hover:underline">
              {booking.customer.firstName} {booking.customer.lastName}
            </Link>
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(booking.rentalStart, "d MMM yyyy")} – {format(booking.rentalEnd, "d MMM yyyy")} · {booking.branch.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PaymentStatusBadge status={booking.paymentStatus} />
          <BookingStatusControl bookingId={booking.id} currentStatus={booking.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Garments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {booking.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/garments/${item.garmentId}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{item.garment.sku}</p>
                    <p className="text-xs text-muted-foreground">{item.garment.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{formatMoney(item.priceAtBooking, booking.branch.currency)}</span>
                    <GarmentStatusBadge status={item.garment.currentStatus} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet.</p>
              ) : (
                booking.events.map((e) => (
                  <div key={e.id} className="flex items-start justify-between border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{e.eventType.replaceAll("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">{e.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(e.createdAt, "d MMM, HH:mm")}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentsList
                documents={documents}
                linkTo={{ bookingId: booking.id }}
                canManage={canManageDocuments}
                revalidatePathTarget={`/dashboard/bookings/${booking.id}`}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-heading text-base">Payments</CardTitle>
              <RecordPaymentDialog bookingId={booking.id} suggestedAmount={Number(booking.balanceDue)} />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                <Row label="Rental Fee" value={formatMoney(booking.rentalFee, booking.branch.currency)} />
                <Row label="Discount" value={`- ${formatMoney(booking.discount, booking.branch.currency)}`} />
                <Row label={`${booking.branch.taxLabel}`} value={formatMoney(booking.taxAmount, booking.branch.currency)} />
                <Row label="Delivery Fee" value={formatMoney(booking.deliveryFee, booking.branch.currency)} />
                <Row label="Total" value={formatMoney(booking.totalAmount, booking.branch.currency)} highlight />
                <Row label="Paid" value={formatMoney(booking.paidAmount, booking.branch.currency)} />
                <Row label="Balance Due" value={formatMoney(booking.balanceDue, booking.branch.currency)} highlight />
              </div>
              {booking.payments.length > 0 && (
                <div className="space-y-1 border-t border-border pt-3">
                  {booking.payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {p.type.replaceAll("_", " ")} · {p.method.replaceAll("_", " ")}
                      </span>
                      <span>{formatMoney(p.amount, booking.branch.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {booking.deposits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base">Deposit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {booking.deposits.map((d) => (
                  <Row key={d.id} label={d.status.replaceAll("_", " ")} value={formatMoney(d.amount, booking.branch.currency)} />
                ))}
              </CardContent>
            </Card>
          )}

          {(booking.damageCharges.length > 0 || canManageDamage) && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="font-heading text-base">Damage Charges</CardTitle>
                {canManageDamage && <DamageChargeDialog bookingId={booking.id} />}
              </CardHeader>
              <CardContent className="space-y-2">
                {booking.damageCharges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No damage charges.</p>
                ) : (
                  booking.damageCharges.map((c) => (
                    <div key={c.id} className="space-y-1 rounded-md border border-border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{c.category}</span>
                        <span>{formatMoney(c.amount, booking.branch.currency)}</span>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">{c.status.replaceAll("_", " ")}</span>
                        {canApproveDamage && c.status === "PENDING" && (
                          <DamageChargeActions chargeId={c.id} amount={Number(c.amount)} />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Key Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {booking.weddingDate && <Row label="Wedding" value={format(booking.weddingDate, "d MMM yyyy")} />}
              {booking.pickupDate && <Row label="Pickup" value={format(booking.pickupDate, "d MMM yyyy")} />}
              {booking.returnDate && <Row label="Return" value={format(booking.returnDate, "d MMM yyyy")} />}
              <Row label="Delivery" value={booking.deliveryMethod.replaceAll("_", " ")} />
              <Row label="Return Method" value={booking.returnMethod.replaceAll("_", " ")} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-heading text-gold" : "font-medium"}>{value}</span>
    </div>
  );
}
