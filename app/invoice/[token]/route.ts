import { NextResponse } from "next/server";
import { getStorageAdapter } from "@/lib/storage";
import { findInvoiceByShareToken, invoiceFileName } from "@/lib/invoices/invoices";

// The customer's link (sent on WhatsApp). No sign-in: the random token in
// the URL is the only way to reach the file, and it's never listed anywhere.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await findInvoiceByShareToken(token);
  if (!invoice) return new NextResponse("This invoice link isn't valid.", { status: 404 });

  const pdf = await getStorageAdapter().getFile(invoice.storageKey);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceFileName(invoice.invoiceNumber)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
