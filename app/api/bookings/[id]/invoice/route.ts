import { NextResponse } from "next/server";
import type { BookingStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getStorageAdapter } from "@/lib/storage";
import { findAccessibleBooking, getOrCreateCurrentInvoice, invoiceFileName } from "@/lib/invoices/invoices";

/** Customers see invoices for their own bookings once they're confirmed. */
const CUSTOMER_INVOICE_STATUSES: BookingStatus[] = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"];

// The booking's current invoice PDF, made on first request (and again
// whenever the booking has changed). Inline to view, `?download=1` to save.
// Backs the View / Download buttons on the staff bookings list and the
// customer portal.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Not found", { status: 404 });
  const { id } = await params;

  let allowed = false;
  if (session.user.role === "CUSTOMER") {
    // A customer only ever reaches bookings on the profile linked to their own login.
    const booking = await db.booking.findFirst({
      where: { id, customer: { userId: session.user.id }, status: { in: CUSTOMER_INVOICE_STATUSES } },
      select: { id: true },
    });
    allowed = Boolean(booking);
  } else if (can(session.user.role, "bookings", "view")) {
    allowed = Boolean(await findAccessibleBooking(session.user, id));
  }
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const invoice = await getOrCreateCurrentInvoice(id, session.user.id);
  const pdf = await getStorageAdapter().getFile(invoice.storageKey);
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoiceFileName(invoice.invoiceNumber)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
