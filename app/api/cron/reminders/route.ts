import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { runDailyReminders } from "@/lib/reminders";

// Called once a day by Vercel Cron (schedule in vercel.json). Vercel sends
// `Authorization: Bearer <CRON_SECRET>` when that env var is set; without it
// the route refuses every request, so nobody else can trigger a run.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDailyReminders();
  return NextResponse.json(result);
}
