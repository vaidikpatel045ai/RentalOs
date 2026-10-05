import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getStorageAdapter } from "@/lib/storage";
import { findAccessibleBooking, getOrCreateCurrentInvoice, invoiceFileName } from "@/lib/invoices/invoices";

// The booking's current invoice PDF, made on first request (and again
// whenever the booking has changed). Inline to view, `?download=1` to save.
// Backs the View / Download buttons on the bookings list.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "bookings", "view")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const { id } = await params;
  if (!(await findAccessibleBooking(session.user, id))) {
    return new NextResponse("Not found", { status: 404 });
  }

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
