import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Lightweight garment picker feed for the booking wizard. Deliberately not
// filtered to currentStatus AVAILABLE only — a garment can be safely booked
// for a future date range even while currently BOOKED/WITH_CUSTOMER; the
// availability engine (not this list) is what decides safety per date range.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ garments: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const branchId = searchParams.get("branchId") ?? undefined;

  const garments = await db.garment.findMany({
    where: {
      isActive: true,
      ...(branchId ? { branchId } : {}),
      ...(q
        ? {
            OR: [
              { sku: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      sku: true,
      name: true,
      category: true,
      rentalPrice: true,
      securityDeposit: true,
      currentStatus: true,
    },
    orderBy: { sku: "asc" },
    take: 30,
  });

  return NextResponse.json({ garments });
}
