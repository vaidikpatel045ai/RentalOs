import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ customers: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const branchId = searchParams.get("branchId") ?? undefined;

  const customers = await db.customer.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, firstName: true, lastName: true, phone: true, weddingDate: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ customers });
}
