import { format } from "date-fns";
import { renderToBuffer } from "@react-pdf/renderer";
import { Prisma, type Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { formatMoney } from "@/lib/currency";
import { enumLabel } from "@/lib/format-enum";
import { InvoiceDocument, type InvoiceView } from "@/lib/invoices/invoice-document";

type SessionUser = {
  id: string;
  role: Role;
  branchId: string | null;
  organizationId: string | null;
};

/** The booking, if this user may see it: same organization, and for
 * branch-bound staff the same branch. Anything else looks like "not found". */
export async function findAccessibleBooking(user: SessionUser, bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      branchId: true,
      updatedAt: true,
      branch: { select: { organizationId: true } },
    },
  });
  if (!booking || !user.organizationId || booking.branch.organizationId !== user.organizationId) return null;
  if (user.role !== "OWNER" && user.branchId && user.branchId !== booking.branchId) return null;
  return booking;
}

async function loadInvoiceView(bookingId: string, invoiceNumber: string, issuedAt: Date): Promise<InvoiceView> {
  const b = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      branch: { include: { organization: { select: { name: true } } } },
      customer: true,
      items: {
        include: { garment: { select: { sku: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      payments: { where: { status: "COMPLETED" }, orderBy: { paidAt: "asc" } },
    },
  });
  const money = (v: unknown) => formatMoney(Number(v), b.branch.currency);
  const discount = Number(b.discount);
  const deliveryFee = Number(b.deliveryFee);
  const balance = Number(b.balanceDue);

  return {
    invoiceNumber,
    issuedOn: format(issuedAt, "d MMM yyyy"),
    boutiqueName: b.branch.organization.name,
    branchName: b.branch.name,
    branchAddress: [
      [b.branch.addressLine1, b.branch.addressLine2].filter(Boolean).join(", "),
      [b.branch.city, b.branch.stateOrRegion, b.branch.postalCode].filter(Boolean).join(", "),
    ].filter(Boolean),
    branchContact: [b.branch.phone, b.branch.email].filter((v): v is string => Boolean(v)),
    customerName: `${b.customer.firstName} ${b.customer.lastName}`,
    customerContact: [b.customer.phone, b.customer.email].filter((v): v is string => Boolean(v)),
    bookingNumber: b.bookingNumber,
    rentalPeriod: `${format(b.rentalStart, "d MMM yyyy")} – ${format(b.rentalEnd, "d MMM yyyy")}`,
    weddingDate: b.weddingDate ? format(b.weddingDate, "d MMM yyyy") : null,
    items: b.items.map((i) => ({
      sku: i.garment.sku,
      name: i.garment.name,
      price: money(i.priceAtBooking),
    })),
    totals: [
      { label: "Rental", value: money(b.rentalFee) },
      ...(discount > 0 ? [{ label: "Discount", value: `- ${money(discount)}` }] : []),
      {
        label: `${b.branch.taxLabel} (${Number(b.branch.taxRate)}%)`,
        value: money(b.taxAmount),
      },
      ...(deliveryFee > 0 ? [{ label: "Delivery", value: money(deliveryFee) }] : []),
      { label: "Total", value: money(b.totalAmount), emphasis: true },
    ],
    deposit: Number(b.depositAmount) > 0 ? money(b.depositAmount) : null,
    payments: b.payments.map((p) => ({
      date: format(p.paidAt, "d MMM yyyy"),
      description: `${enumLabel(p.type)} · ${enumLabel(p.method)}`,
      amount: money(p.amount),
    })),
    paid: money(b.paidAmount),
    balanceDue: money(balance),
    isPaid: balance <= 0,
    notes: null,
  };
}

/**
 * The booking's current invoice: the latest one if nothing on the booking
 * has changed since it was made, otherwise a freshly generated version
 * (rendered to PDF, stored in S3, recorded in the database).
 */
export async function getOrCreateCurrentInvoice(bookingId: string, userId: string) {
  const [booking, latest] = await Promise.all([
    db.booking.findUniqueOrThrow({
      where: { id: bookingId },
      select: {
        bookingNumber: true,
        updatedAt: true,
        totalAmount: true,
        balanceDue: true,
        branch: { select: { organizationId: true } },
      },
    }),
    db.invoice.findFirst({
      where: { bookingId },
      orderBy: { version: "desc" },
    }),
  ]);
  if (latest && latest.createdAt >= booking.updatedAt) return latest;

  const version = (latest?.version ?? 0) + 1;
  // "BK-2026-0001" -> "INV-2026-0001", then "INV-2026-0001-2" for later versions.
  const base = booking.bookingNumber.replace(/^BK-/, "INV-");
  const invoiceNumber = version === 1 ? base : `${base}-${version}`;
  const issuedAt = new Date();

  const view = await loadInvoiceView(bookingId, invoiceNumber, issuedAt);
  const pdf = await renderToBuffer(<InvoiceDocument invoice={view} />);
  // The adapter names the object with a random UUID, so it is reachable only via the link.
  const stored = await getStorageAdapter().uploadFile(Buffer.from(pdf), {
    filename: `${invoiceNumber}.pdf`,
    contentType: "application/pdf",
    folder: `invoices/${booking.branch.organizationId}`,
  });

  try {
    return await db.invoice.create({
      data: {
        bookingId,
        invoiceNumber,
        version,
        storageKey: stored.key,
        fileUrl: stored.url,
        totalAmount: booking.totalAmount,
        balanceDue: booking.balanceDue,
        createdByUserId: userId,
        createdAt: issuedAt,
      },
    });
  } catch (error) {
    // Two clicks at once: the other request already saved this version, so use it.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return db.invoice.findFirstOrThrow({
        where: { bookingId },
        orderBy: { version: "desc" },
      });
    }
    throw error;
  }
}

/** The random part of the storage key, used in the customer-facing link. */
export function invoiceShareToken(storageKey: string): string {
  return storageKey
    .split("/")
    .pop()!
    .replace(/\.pdf$/, "");
}

export async function findInvoiceByShareToken(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  return db.invoice.findFirst({
    where: { storageKey: { endsWith: `/${token}.pdf` } },
  });
}

export function invoiceFileName(invoiceNumber: string) {
  return `${invoiceNumber}.pdf`;
}
