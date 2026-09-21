import { format } from "date-fns";
import { FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/domain/status-badge";
import { formatMoney } from "@/lib/currency";
import { MEASUREMENT_FIELDS, MEASUREMENT_LABELS } from "@/lib/measurements";
import { enumLabel } from "@/lib/format-enum";

export default async function CustomerPortalPage() {
  const session = await auth();
  const customer = await db.customer.findUnique({
    where: { userId: session?.user.id },
    include: {
      bookings: {
        include: { items: { include: { garment: true } }, branch: true },
        orderBy: { createdAt: "desc" },
      },
      appointments: { orderBy: { scheduledAt: "asc" }, where: { scheduledAt: { gte: new Date() } } },
      measurements: { where: { isLatest: true }, take: 1 },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) {
    return <p className="text-sm text-muted-foreground">No customer profile linked to this account yet.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-xl">Welcome, {customer.firstName}</h1>
        <p className="text-sm text-muted-foreground">Your bookings and upcoming appointments.</p>
      </div>

      {customer.appointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customer.appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-sm">{a.type.replaceAll("_", " ")}</span>
                <span className="text-sm text-muted-foreground">{format(a.scheduledAt, "d MMM, HH:mm")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {customer.bookings.map((b) => (
          <Card key={b.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="font-heading text-base">{b.items.map((i) => i.garment.name).join(", ")}</CardTitle>
              <BookingStatusBadge status={b.status} />
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                {format(b.rentalStart, "d MMM")} – {format(b.rentalEnd, "d MMM yyyy")}
              </p>
              <div className="flex items-center justify-between">
                <PaymentStatusBadge status={b.paymentStatus} />
                <span>{formatMoney(b.balanceDue, b.branch.currency)} due</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customer.measurements[0] && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Your Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Version {customer.measurements[0].version} · taken {format(customer.measurements[0].takenAt, "d MMM yyyy")}
              {customer.measurements[0].verified ? " · verified" : ""}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MEASUREMENT_FIELDS.map((field) => {
                const value = customer.measurements[0][field];
                if (value === null || value === undefined) return null;
                return (
                  <div key={field}>
                    <p className="text-xs text-muted-foreground">{MEASUREMENT_LABELS[field]}</p>
                    <p className="text-sm font-medium">
                      {String(value)} {customer.measurements[0].unit}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {customer.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Your Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customer.documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  {doc.fileName}
                </span>
                <span className="text-xs text-muted-foreground">{enumLabel(doc.type)}</span>
              </a>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
