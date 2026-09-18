import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Phone, MessageCircle, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/domain/status-badge";
import { MeasurementFormDialog } from "@/components/domain/measurement-form-dialog";
import { addMeasurement } from "@/lib/actions/customer-actions";
import { formatMoney } from "@/lib/currency";

const MEASUREMENT_FIELDS: { key: string; label: string }[] = [
  { key: "bust", label: "Bust" },
  { key: "underbust", label: "Underbust" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hip" },
  { key: "shoulder", label: "Shoulder" },
  { key: "armhole", label: "Armhole" },
  { key: "sleeve", label: "Sleeve" },
  { key: "bicep", label: "Bicep" },
  { key: "blouseLength", label: "Blouse Length" },
  { key: "frontLength", label: "Front Length" },
  { key: "backLength", label: "Back Length" },
  { key: "hollowToHem", label: "Hollow to Hem" },
  { key: "height", label: "Height" },
  { key: "heelHeight", label: "Heel Height" },
  { key: "lehengaWaist", label: "Lehenga Waist" },
  { key: "lehengaLength", label: "Lehenga Length" },
  { key: "trainLength", label: "Train Length" },
];

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      branch: true,
      measurements: { orderBy: { version: "desc" } },
      bookings: { orderBy: { createdAt: "desc" }, include: { items: { include: { garment: true } } } },
      appointments: { orderBy: { scheduledAt: "desc" }, take: 10 },
    },
  });
  if (!customer) notFound();

  const latestMeasurement = customer.measurements.find((m) => m.isLatest);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">
            {customer.firstName} {customer.lastName}
          </h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" /> {customer.phone}
            </span>
            {customer.whatsapp && (
              <span className="flex items-center gap-1">
                <MessageCircle className="size-3.5" /> {customer.whatsapp}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" /> {customer.email}
              </span>
            )}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/customers/${customer.id}/edit`}>
            <Pencil className="size-4" /> Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Wedding Date</p>
            <p className="font-heading text-lg">
              {customer.weddingDate ? format(customer.weddingDate, "d MMM yyyy") : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Venue</p>
            <p className="font-heading text-lg">{customer.weddingVenue ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Branch</p>
            <p className="font-heading text-lg">{customer.branch.name}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Bookings ({customer.bookings.length})</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="notes">Notes & Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-2">
          {customer.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            customer.bookings.map((b) => (
              <Link
                key={b.id}
                href={`/dashboard/bookings/${b.id}`}
                className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium">{b.bookingNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.items.map((i) => i.garment.sku).join(", ")} · {formatMoney(b.totalAmount)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <BookingStatusBadge status={b.status} />
                  <PaymentStatusBadge status={b.paymentStatus} />
                </div>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="measurements" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {latestMeasurement
                ? `Latest — version ${latestMeasurement.version}, taken ${format(latestMeasurement.takenAt, "d MMM yyyy")}`
                : "No measurements recorded yet."}
            </p>
            <MeasurementFormDialog customerId={customer.id} action={addMeasurement.bind(null, customer.id)} />
          </div>
          {latestMeasurement && (
            <Card>
              <CardContent className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
                {MEASUREMENT_FIELDS.map((f) => {
                  const value = (latestMeasurement as unknown as Record<string, unknown>)[f.key];
                  if (value === null || value === undefined) return null;
                  return (
                    <div key={f.key}>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium">{String(value)} cm</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          {customer.measurements.length > 1 && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">History</p>
              <div className="space-y-1">
                {customer.measurements
                  .filter((m) => !m.isLatest)
                  .map((m) => (
                    <div key={m.id} className="rounded-md border border-border p-2 text-xs text-muted-foreground">
                      Version {m.version} — {format(m.takenAt, "d MMM yyyy")}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="appointments" className="space-y-2">
          {customer.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
          ) : (
            customer.appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{a.type.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{format(a.scheduledAt, "d MMM yyyy, HH:mm")}</p>
                </div>
                <span className="text-xs text-muted-foreground">{a.status.replaceAll("_", " ")}</span>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="notes" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-sm">Style Preferences</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {customer.stylePreferences || "None recorded."}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{customer.notes || "None recorded."}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
