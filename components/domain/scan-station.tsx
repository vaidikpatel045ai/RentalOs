"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Loader2, ScanLine, Shirt, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GarmentStatusBadge } from "@/components/domain/status-badge";
import { QrScanner } from "@/components/domain/qr-scanner";
import { checkInGarment, checkOutGarment, lookupScannedCode, type ScanResult } from "@/lib/actions/scan-actions";

type Found = Extract<ScanResult, { ok: true }>;

interface LogEntry {
  id: number;
  at: string;
  text: string;
  kind: "out" | "in";
}

export function ScanStation() {
  const [result, setResult] = useState<Found | null>(null);
  const [looking, setLooking] = useState(false);
  const [acting, startAction] = useTransition();
  const [manual, setManual] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const logId = useRef(0);

  const lookup = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setLooking(true);
    try {
      const found = await lookupScannedCode(code);
      if (!found.ok) {
        toast.error(found.error);
        return;
      }
      setResult(found);
      // A short buzz on phones that support it confirms the scan registered.
      navigator.vibrate?.(60);
    } catch {
      toast.error("Couldn't look up that code. Try again.");
    } finally {
      setLooking(false);
    }
  }, []);

  function addLog(text: string, kind: LogEntry["kind"]) {
    logId.current += 1;
    const at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLog((prev) => [{ id: logId.current, at, text, kind }, ...prev].slice(0, 20));
  }

  function act(run: () => Promise<{ ok: true; message: string; allReturned?: boolean } | { ok: false; error: string }>, kind: LogEntry["kind"]) {
    startAction(async () => {
      const res = await run();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      if (res.allReturned && result?.booking) {
        toast.info(`Every garment on ${result.booking.bookingNumber} is back. You can complete the booking.`);
      }
      addLog(res.message, kind);
      setResult(null);
    });
  }

  const booking = result?.booking ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <QrScanner onCode={lookup} paused={looking || acting || result !== null} />
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void lookup(manual);
                setManual("");
              }}
            >
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Handheld scanner or type a code, e.g. BR-102"
                aria-label="Garment code"
                autoFocus
              />
              <Button type="submit" variant="outline" disabled={looking || !manual.trim()}>
                Find
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {looking ? (
          <Card>
            <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Looking up the garment…
            </CardContent>
          </Card>
        ) : result ? (
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  {result.garment.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.garment.imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Shirt className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <CardTitle className="font-heading text-lg">
                    <Link href={`/dashboard/garments/${result.garment.id}`} className="hover:underline">
                      {result.garment.sku}
                    </Link>{" "}
                    <span className="font-sans text-base font-normal text-muted-foreground">{result.garment.name}</span>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <GarmentStatusBadge status={result.garment.status} />
                    <span>{result.garment.branchName}</span>
                  </div>
                </div>
              </div>
              <CardAction>
                <Button variant="ghost" size="icon-sm" aria-label="Clear" onClick={() => setResult(null)}>
                  <X className="size-4" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking && (
                <div className="rounded-md border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/dashboard/bookings/${booking.id}`} className="font-mono text-xs font-medium hover:underline">
                      {booking.bookingNumber}
                    </Link>
                    <span className="text-xs text-muted-foreground">{booking.rentalWindow}</span>
                  </div>
                  <p className="mt-1 font-medium">{booking.customerName}</p>
                  <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
                </div>
              )}

              {result.mode === "check-out" && booking && booking.balanceDue > 0 && (
                <p className="flex items-start gap-2 rounded-md bg-risk-tight/10 p-3 text-sm text-risk-tight">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Balance of {booking.balanceDueLabel} still due on this booking. Collect it before handing over if your policy
                  requires.
                </p>
              )}
              {result.mode === "check-in" && booking && booking.daysLate > 0 && (
                <p className="flex items-start gap-2 rounded-md bg-risk-unsafe/10 p-3 text-sm text-risk-unsafe">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Returned {booking.daysLate} day{booking.daysLate === 1 ? "" : "s"} late.
                </p>
              )}
              {result.mode === "check-in" && !booking && (
                <p className="text-sm text-muted-foreground">No active booking found for this garment. It will be checked in on its own.</p>
              )}
              {result.mode === "none" && <p className="text-sm text-muted-foreground">{result.reason}</p>}

              {!result.canAct && result.mode !== "none" && (
                <p className="text-sm text-muted-foreground">You can look garments up, but checking them in or out needs a manager or front-desk login.</p>
              )}

              {result.canAct && result.mode === "check-out" && booking && (
                <Button
                  size="lg"
                  className="w-full"
                  disabled={acting}
                  onClick={() => act(() => checkOutGarment(result.garment.id, booking.id), "out")}
                >
                  <ArrowUpFromLine className="size-4" />
                  {acting ? "Checking out…" : `Check out to ${booking.customerName}`}
                </Button>
              )}
              {result.canAct && result.mode === "check-in" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    size="lg"
                    disabled={acting}
                    onClick={() => act(() => checkInGarment(result.garment.id, booking?.id ?? null, "cleaning"), "in")}
                  >
                    <ArrowDownToLine className="size-4" />
                    {acting ? "Checking in…" : "Check in, send to cleaning"}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={acting}
                    onClick={() => act(() => checkInGarment(result.garment.id, booking?.id ?? null, "inspection"), "in")}
                  >
                    <AlertTriangle className="size-4" />
                    Check in, flag damage
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <ScanLine className="size-8" />
              Scan a garment&apos;s QR tag to check it out to a customer or back in.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">This Session</CardTitle>
          </CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground">Check-outs and check-ins you make here will be listed.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {log.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <span className="w-12 shrink-0 text-xs text-muted-foreground">{entry.at}</span>
                    {entry.kind === "out" ? (
                      <ArrowUpFromLine className="mt-0.5 size-3.5 shrink-0 text-gold" />
                    ) : (
                      <ArrowDownToLine className="mt-0.5 size-3.5 shrink-0 text-risk-safe" />
                    )}
                    <span>{entry.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
