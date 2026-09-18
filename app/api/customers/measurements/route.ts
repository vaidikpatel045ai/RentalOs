import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { snapshotMeasurement } from "@/lib/measurements";

/** Latest measurement snapshot for one customer — powers the "measurements
 * that will be sent to the tailor" preview on the tailoring assignment form. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ measurement: null }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  if (!customerId) return NextResponse.json({ measurement: null });

  const latest = await db.customerMeasurement.findFirst({
    where: { customerId, isLatest: true },
  });

  return NextResponse.json({ measurement: latest ? snapshotMeasurement(latest) : null });
}
