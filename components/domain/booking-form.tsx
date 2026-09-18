"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { Branch } from "@prisma/client";
import type { AvailabilityResult } from "@/lib/availability-engine";
import type { BookingInput } from "@/lib/validations/booking";
import { createBooking } from "@/lib/actions/booking-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Combobox, type ComboboxOption } from "@/components/domain/combobox";
import { RiskBadge } from "@/components/domain/status-badge";
import { formatMoney } from "@/lib/currency";

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}
interface GarmentOption {
  id: string;
  sku: string;
  name: string;
  rentalPrice: string;
  securityDeposit: string;
}
interface BookingItemRow {
  garmentId: string;
  sku: string;
  name: string;
  priceAtBooking: number;
  depositAtBooking: number;
  availability?: AvailabilityResult;
}

const DELIVERY_METHODS = ["STORE_PICKUP", "STORE_RETURN", "HOME_DELIVERY", "HOME_PICKUP", "COURIER", "EXPRESS"] as const;

export function BookingForm({ branches, defaultBranchId }: { branches: Branch[]; defaultBranchId?: string }) {
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? "");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [garments, setGarments] = useState<GarmentOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<BookingItemRow[]>([]);
  const [rentalStart, setRentalStart] = useState("");
  const [rentalEnd, setRentalEnd] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<BookingInput["deliveryMethod"]>("STORE_PICKUP");
  const [returnMethod, setReturnMethod] = useState<BookingInput["returnMethod"]>("STORE_RETURN");
  const [discount, setDiscount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [riskReasons, setRiskReasons] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/customers?branchId=${branchId}`).then((r) => r.json()).then((d) => setCustomers(d.customers ?? []));
    fetch(`/api/garments?branchId=${branchId}`).then((r) => r.json()).then((d) => setGarments(d.garments ?? []));
  }, [branchId]);

  // Re-check availability for each selected garment whenever dates change.
  useEffect(() => {
    if (!rentalStart || !rentalEnd || items.length === 0) return;
    let cancelled = false;
    (async () => {
      const updated = await Promise.all(
        items.map(async (item) => {
          const res = await fetch(
            `/api/availability?garmentId=${item.garmentId}&start=${rentalStart}&end=${rentalEnd}`
          );
          const availability: AvailabilityResult = await res.json();
          return { ...item, availability };
        })
      );
      if (!cancelled) setItems(updated);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentalStart, rentalEnd, items.length]);

  const customerOptions: ComboboxOption[] = customers.map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName}`,
    sublabel: c.phone,
  }));
  const availableGarmentOptions: ComboboxOption[] = garments
    .filter((g) => !items.some((i) => i.garmentId === g.id))
    .map((g) => ({ value: g.id, label: `${g.sku} — ${g.name}`, sublabel: formatMoney(g.rentalPrice) }));

  function addGarment(garmentId: string) {
    const g = garments.find((x) => x.id === garmentId);
    if (!g) return;
    setItems((prev) => [
      ...prev,
      { garmentId: g.id, sku: g.sku, name: g.name, priceAtBooking: Number(g.rentalPrice), depositAtBooking: Number(g.securityDeposit) },
    ]);
  }

  const rentalFee = items.reduce((s, i) => s + i.priceAtBooking, 0);
  const depositTotal = items.reduce((s, i) => s + i.depositAtBooking, 0);
  const branch = branches.find((b) => b.id === branchId);
  const taxRate = branch ? Number(branch.taxRate) : 5;
  const taxAmount = Math.max(0, rentalFee - discount) * (taxRate / 100);
  const total = Math.max(0, rentalFee - discount) + taxAmount + deliveryFee;

  function buildInput(acknowledgeRisk: boolean): BookingInput | null {
    if (!customerId || items.length === 0 || !rentalStart || !rentalEnd) {
      toast.error("Select a customer, at least one garment, and rental dates.");
      return null;
    }
    return {
      branchId,
      customerId,
      items: items.map((i) => ({
        garmentId: i.garmentId,
        priceAtBooking: i.priceAtBooking,
        depositAtBooking: i.depositAtBooking,
      })),
      rentalStart: new Date(rentalStart),
      rentalEnd: new Date(rentalEnd),
      weddingDate: weddingDate ? new Date(weddingDate) : null,
      pickupDate: pickupDate ? new Date(pickupDate) : null,
      returnDate: returnDate ? new Date(returnDate) : null,
      trialDate: null,
      fittingDate: null,
      deliveryMethod,
      returnMethod,
      pickupLocation: "",
      discount,
      deliveryFee,
      assignedStaffId: null,
      notes,
      acknowledgeRisk,
    };
  }

  function submit(acknowledgeRisk: boolean) {
    const input = buildInput(acknowledgeRisk);
    if (!input) return;
    startTransition(async () => {
      const result = await createBooking(input);
      if (result?.requiresConfirmation) {
        setRiskReasons(result.riskReasons ?? []);
        setConfirmOpen(true);
        return;
      }
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Customer & Branch</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Combobox
              options={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              placeholder="Select customer…"
              searchPlaceholder="Search by name or phone…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Garments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Combobox
            options={availableGarmentOptions}
            onChange={addGarment}
            placeholder="Add a garment…"
            searchPlaceholder="Search SKU or name…"
          />
          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.garmentId} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                  <div className="min-w-32 flex-1">
                    <p className="text-sm font-medium">{item.sku}</p>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      value={item.priceAtBooking}
                      onChange={(e) =>
                        setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, priceAtBooking: Number(e.target.value) } : p)))
                      }
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Deposit</Label>
                    <Input
                      type="number"
                      value={item.depositAtBooking}
                      onChange={(e) =>
                        setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, depositAtBooking: Number(e.target.value) } : p)))
                      }
                    />
                  </div>
                  {item.availability && <RiskBadge risk={item.availability.risk} />}
                  <Button type="button" variant="ghost" size="icon" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Dates & Delivery</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Rental Start</Label>
            <Input type="datetime-local" value={rentalStart} onChange={(e) => setRentalStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rental End</Label>
            <Input type="datetime-local" value={rentalEnd} onChange={(e) => setRentalEnd(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Wedding Date</Label>
            <Input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Pickup Date</Label>
            <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Return Date</Label>
            <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Delivery Method</Label>
            <Select value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as BookingInput["deliveryMethod"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Return Method</Label>
            <Select value={returnMethod} onValueChange={(v) => setReturnMethod(v as BookingInput["returnMethod"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Discount</Label>
              <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Fee</Label>
              <Input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1 rounded-md bg-muted p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rental Fee</span>
              <span>{formatMoney(rentalFee, branch?.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposit</span>
              <span>{formatMoney(depositTotal, branch?.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {branch?.taxLabel ?? "Tax"} ({taxRate}%)
              </span>
              <span>{formatMoney(taxAmount, branch?.currency)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-heading text-base">
              <span>Total</span>
              <span>{formatMoney(total, branch?.currency)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Button size="lg" disabled={isPending} onClick={() => submit(false)}>
        {isPending ? "Creating…" : "Create Booking"}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turnaround is tight</DialogTitle>
            <DialogDescription>
              This booking is operationally possible, but leaves little buffer for cleaning/QC before the next
              booking. Proceed anyway?
            </DialogDescription>
          </DialogHeader>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {riskReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                submit(true);
              }}
            >
              Book Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
