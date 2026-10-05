"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { permissionError } from "@/lib/permissions";
import { formatMoney } from "@/lib/currency";
import { escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { getStorageAdapter } from "@/lib/storage";
import {
  findAccessibleBooking,
  getOrCreateCurrentInvoice,
  invoiceFileName,
  invoiceShareToken,
} from "@/lib/invoices/invoices";

export type InvoicePurpose = "download" | "print" | "whatsapp";

export type PreparedInvoice =
  | {
      ok: true;
      invoiceId: string;
      invoiceNumber: string;
      /** Same-origin, signed-in routes for staff. */
      viewUrl: string;
      downloadUrl: string;
      /** Public link for the customer. */
      shareUrl: string;
      whatsappUrl: string | null;
    }
  | { ok: false; error: string };

async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function loadBookingForMessage(bookingId: string) {
  return db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: {
      bookingNumber: true,
      customer: { select: { firstName: true, lastName: true, phone: true, whatsapp: true, email: true } },
      branch: { select: { name: true, email: true, currency: true, organization: { select: { name: true } } } },
    },
  });
}

/** Makes sure the booking has an up-to-date invoice and returns its links.
 * For WhatsApp, also records the share on the booking's timeline. */
export async function prepareInvoice(bookingId: string, purpose: InvoicePurpose): Promise<PreparedInvoice> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "bookings", purpose === "whatsapp" ? "update" : "view");
  if (permissionMsg) return { ok: false, error: permissionMsg };
  if (!(await findAccessibleBooking(session.user, bookingId))) return { ok: false, error: "Booking not found." };

  const invoice = await getOrCreateCurrentInvoice(bookingId, session.user.id);
  const booking = await loadBookingForMessage(bookingId);
  const shareUrl = `${await appOrigin()}/invoice/${invoiceShareToken(invoice.storageKey)}`;

  let whatsappUrl: string | null = null;
  const number = (booking.customer.whatsapp || booking.customer.phone).replace(/\D/g, "");
  if (number) {
    const balance = Number(invoice.balanceDue);
    const message = [
      `Hi ${booking.customer.firstName},`,
      ``,
      `Here is your invoice ${invoice.invoiceNumber} from ${booking.branch.organization.name} for booking ${booking.bookingNumber}.`,
      `Total: ${formatMoney(invoice.totalAmount, booking.branch.currency)}`,
      balance > 0 ? `Balance due: ${formatMoney(balance, booking.branch.currency)}` : `Paid in full. Thank you!`,
      ``,
      shareUrl,
    ].join("\n");
    whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  if (purpose === "whatsapp") {
    if (!whatsappUrl) return { ok: false, error: "This customer has no phone or WhatsApp number." };
    await db.bookingEvent.create({
      data: {
        bookingId,
        eventType: "INVOICE_SHARED",
        description: `Invoice ${invoice.invoiceNumber} shared on WhatsApp`,
        actorUserId: session.user.id,
        actorRole: session.user.role,
      },
    });
  }
  revalidatePath(`/dashboard/bookings/${bookingId}`);

  return {
    ok: true,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    viewUrl: `/api/invoices/${invoice.id}`,
    downloadUrl: `/api/invoices/${invoice.id}?download=1`,
    shareUrl,
    whatsappUrl,
  };
}

/** Emails the current invoice to the customer with the PDF attached. */
export async function emailInvoice(bookingId: string): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "bookings", "update");
  if (permissionMsg) return { ok: false, error: permissionMsg };
  if (!(await findAccessibleBooking(session.user, bookingId))) return { ok: false, error: "Booking not found." };
  if (!isEmailConfigured()) return { ok: false, error: "Email isn't set up yet. Add a Resend API key to enable it." };

  const booking = await loadBookingForMessage(bookingId);
  const to = booking.customer.email;
  if (!to) return { ok: false, error: "This customer has no email address. Add one on their profile first." };

  const invoice = await getOrCreateCurrentInvoice(bookingId, session.user.id);
  const pdf = await getStorageAdapter().getFile(invoice.storageKey);
  const boutique = booking.branch.organization.name;
  const total = formatMoney(invoice.totalAmount, booking.branch.currency);
  const balance = Number(invoice.balanceDue);
  const balanceLine =
    balance > 0 ? `Balance due: ${formatMoney(balance, booking.branch.currency)}` : "This booking is paid in full. Thank you!";

  const text = [
    `Hi ${booking.customer.firstName},`,
    ``,
    `Please find attached invoice ${invoice.invoiceNumber} for your booking ${booking.bookingNumber}.`,
    `Total: ${total}`,
    balanceLine,
    ``,
    `If you have any questions, just reply to this email.`,
    ``,
    boutique,
  ].join("\n");
  const html = text
    .split("\n")
    .map((line) => (line ? `<p style="margin:0 0 4px">${escapeHtml(line)}</p>` : "<br>"))
    .join("");

  const result = await sendEmail({
    to,
    subject: `Invoice ${invoice.invoiceNumber} from ${boutique}`,
    text,
    html,
    fromName: boutique,
    replyTo: booking.branch.email ?? undefined,
    attachments: [{ filename: invoiceFileName(invoice.invoiceNumber), content: pdf }],
  });
  if (!result.ok) return result;

  await db.bookingEvent.create({
    data: {
      bookingId,
      eventType: "INVOICE_SHARED",
      description: `Invoice ${invoice.invoiceNumber} emailed to ${to}`,
      actorUserId: session.user.id,
      actorRole: session.user.role,
    },
  });
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return { ok: true, to };
}
