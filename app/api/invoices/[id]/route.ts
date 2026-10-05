import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getStorageAdapter } from "@/lib/storage";
import { findAccessibleBooking, invoiceFileName } from "@/lib/invoices/invoices";

// Staff access to a stored invoice PDF: inline for viewing/printing, or
// `?download=1` to save it. Checks the booking belongs to the viewer.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "bookings", "view")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const { id } = await params;
  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice || !(await findAccessibleBooking(session.user, invoice.bookingId))) {
    return new NextResponse("Not found", { status: 404 });
  }

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
