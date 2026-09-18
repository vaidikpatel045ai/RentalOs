import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface SearchResult {
  type: "customer" | "garment" | "booking";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

// Global search across customer / garment / booking by name, phone, SKU or
// booking number (spec section 31). Scoped to the caller's branch unless
// they're OWNER (who sees across all branches).
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ results: [] satisfies SearchResult[] }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] satisfies SearchResult[] });
  }

  const branchFilter =
    session.user.role === "OWNER" || !session.user.branchId
      ? {}
      : { branchId: session.user.branchId };

  const [customers, garments, bookings] = await Promise.all([
    db.customer.findMany({
      where: {
        ...branchFilter,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { whatsapp: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
    }),
    db.garment.findMany({
      where: {
        ...branchFilter,
        OR: [
          { sku: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
    }),
    db.booking.findMany({
      where: {
        ...branchFilter,
        OR: [{ bookingNumber: { contains: q, mode: "insensitive" } }],
      },
      include: { customer: true },
      take: 5,
    }),
  ]);

  const results: SearchResult[] = [
    ...customers.map((c) => ({
      type: "customer" as const,
      id: c.id,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.phone,
      href: `/dashboard/customers/${c.id}`,
    })),
    ...garments.map((g) => ({
      type: "garment" as const,
      id: g.id,
      title: `${g.sku} — ${g.name}`,
      subtitle: g.category.replaceAll("_", " "),
      href: `/dashboard/garments/${g.id}`,
    })),
    ...bookings.map((b) => ({
      type: "booking" as const,
      id: b.id,
      title: b.bookingNumber,
      subtitle: `${b.customer.firstName} ${b.customer.lastName}`,
      href: `/dashboard/bookings/${b.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
