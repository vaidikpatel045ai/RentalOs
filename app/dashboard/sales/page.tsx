import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/domain/status-badge";
import { formatMoney } from "@/lib/currency";

export default async function SalesDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const branchWhere = session.user.branchId ? { branchId: session.user.branchId } : {};

  const [todayAppointments, recentBookings] = await Promise.all([
    db.appointment.findMany({
      where: { ...branchWhere, scheduledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      include: { customer: true },
      orderBy: { scheduledAt: "asc" },
      take: 8,
    }),
    db.booking.findMany({
      where: branchWhere,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Front Desk</h1>
          <p className="text-sm text-muted-foreground">Today&apos;s appointments and recent bookings.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/appointments/new">
              <Plus className="size-4" /> New Appointment
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/bookings/new">
              <Plus className="size-4" /> New Booking
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Today&apos;s Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments scheduled today.</p>
            ) : (
              todayAppointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {a.customer.firstName} {a.customer.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.type.replaceAll("_", " ")}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{format(a.scheduledAt, "HH:mm")}</span>
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
            {recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              recentBookings.map((b) => (
                <Link
                  key={b.id}
                  href={`/dashboard/bookings/${b.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{b.bookingNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.customer.firstName} {b.customer.lastName} · {formatMoney(b.totalAmount)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <BookingStatusBadge status={b.status} />
                    <PaymentStatusBadge status={b.paymentStatus} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
