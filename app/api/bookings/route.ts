import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Booking picker feed — used by the delivery-job creation form. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ bookings: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const branchId = searchParams.get("branchId") ?? undefined;

  const bookings = await db.booking.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      ...(q
        ? {
            OR: [
              { bookingNumber: { contains: q, mode: "insensitive" } },
              { customer: { firstName: { contains: q, mode: "insensitive" } } },
              { customer: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      customerName: `${b.customer.firstName} ${b.customer.lastName}`,
      customerPhone: b.customer.phone,
    })),
  });
}
