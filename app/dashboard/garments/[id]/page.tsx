import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Shirt } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { generateQrDataUrl } from "@/lib/qr";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GarmentStatusBadge } from "@/components/domain/status-badge";
import { GarmentStatusControl } from "@/components/domain/garment-status-control";
import { GarmentImageUpload } from "@/components/domain/garment-image-upload";
import { GarmentDeleteControl } from "@/components/domain/garment-delete-control";

export default async function GarmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const garment = await db.garment.findUnique({
    where: { id },
    include: {
      branch: true,
      images: { orderBy: { order: "asc" } },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 15, include: { changedBy: true } },
      components: true,
      bookingItems: {
        include: { booking: { include: { customer: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  if (!garment) notFound();

  const session = await auth();
  const canEdit = Boolean(session?.user && can(session.user.role, "garments", "update"));
  const canDelete = Boolean(session?.user && can(session.user.role, "garments", "delete"));

  const qrDataUrl = await generateQrDataUrl(garment.qrCodeValue);

  const purchaseCost = Number(garment.purchaseCost);
  const totalCost =
    purchaseCost + Number(garment.cleaningCostTotal) + Number(garment.repairCostTotal) + Number(garment.alterationCostTotal);
  const revenue = Number(garment.totalRentalRevenue);
  const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{garment.sku}</p>
          <h1 className="font-heading text-2xl">{garment.name}</h1>
          <p className="text-sm text-muted-foreground">
            {garment.category.replaceAll("_", " ")} · {garment.branch.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GarmentStatusBadge status={garment.currentStatus} />
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/garments/${garment.id}/edit`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
          )}
          {canDelete && <GarmentDeleteControl garmentId={garment.id} currentStatus={garment.currentStatus} sku={garment.sku} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-heading text-base">Photos</CardTitle>
              {canEdit && <GarmentImageUpload garmentId={garment.id} />}
            </CardHeader>
            <CardContent>
              {garment.images.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Shirt className="size-10" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {garment.images.map((img) => (
                    <div key={img.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
                      <Image src={img.url} alt={garment.name} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Designer" value={garment.designer} />
              <Field label="Collection" value={garment.collection} />
              <Field label="Brand" value={garment.brand} />
              <Field label="Size" value={garment.size} />
              <Field label="Color" value={garment.color} />
              <Field label="Fabric" value={garment.fabric} />
              <Field label="Season" value={garment.season} />
              <Field label="Year" value={garment.year?.toString()} />
              <Field label="Condition Score" value={`${garment.conditionScore}/10`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {garment.statusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                garment.statusHistory.map((h) => (
                  <div key={h.id} className="flex items-start justify-between border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="text-sm">
                        {h.fromStatus ? `${h.fromStatus.replaceAll("_", " ")} → ` : ""}
                        <span className="font-medium">{h.toStatus.replaceAll("_", " ")}</span>
                      </p>
                      {h.notes && <p className="text-xs text-muted-foreground">{h.notes}</p>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{h.changedBy?.name ?? "System"}</p>
                      <p>{format(h.createdAt, "d MMM, HH:mm")}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {garment.bookingItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Never booked yet.</p>
              ) : (
                garment.bookingItems.map((bi) => (
                  <Link
                    key={bi.id}
                    href={`/dashboard/bookings/${bi.bookingId}`}
                    className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-accent"
                  >
                    <div>
                      <p className="text-sm font-medium">{bi.booking.bookingNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {bi.booking.customer.firstName} {bi.booking.customer.lastName}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(bi.booking.rentalStart, "d MMM")} – {format(bi.booking.rentalEnd, "d MMM")}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base">Change Status</CardTitle>
              </CardHeader>
              <CardContent>
                <GarmentStatusControl garmentId={garment.id} currentStatus={garment.currentStatus} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">QR Code</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- small local data: URL, next/image adds no value here */}
              <img src={qrDataUrl} alt={`QR code for ${garment.sku}`} className="size-40" />
              <p className="font-mono text-xs text-muted-foreground">{garment.qrCodeValue}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Rental Price" value={formatMoney(garment.rentalPrice, garment.branch.currency)} />
              <Row label="Security Deposit" value={formatMoney(garment.securityDeposit, garment.branch.currency)} />
              <Row label="Purchase Cost" value={formatMoney(garment.purchaseCost, garment.branch.currency)} />
              <Row label="Total Rentals" value={String(garment.rentalCount)} />
              <Row label="Total Revenue" value={formatMoney(garment.totalRentalRevenue, garment.branch.currency)} />
              <Row label="ROI" value={roi !== null ? `${roi.toFixed(0)}%` : "—"} highlight />
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

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-heading text-gold" : "font-medium"}>{value}</span>
    </div>
  );
}
