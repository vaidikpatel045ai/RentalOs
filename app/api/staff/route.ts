import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

/** Staff picker feed, filterable by role — used by tailoring/cleaning/delivery
 * job-assignment forms to list the relevant specialists for a branch. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ staff: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") ?? undefined;
  const branchId = searchParams.get("branchId") ?? undefined;

  const staff = await db.user.findMany({
    where: {
      ...(role ? { role: role as Role } : {}),
      ...(branchId ? { branchId } : {}),
      isActive: true,
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
    take: 50,
  });

  return NextResponse.json({ staff });
}
