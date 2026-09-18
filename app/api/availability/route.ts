import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkAvailability } from "@/lib/availability-engine";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const garmentId = searchParams.get("garmentId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const excludeBookingId = searchParams.get("excludeBookingId") ?? undefined;

  if (!garmentId || !start || !end) {
    return NextResponse.json({ error: "garmentId, start and end are required" }, { status: 400 });
  }

  const result = await checkAvailability({
    garmentId,
    proposedStart: new Date(start),
    proposedEnd: new Date(end),
    excludeBookingId,
  });

  return NextResponse.json(result);
}
