import { cn } from "@/lib/utils";
import type {
  AvailabilityRisk,
  BookingStatus,
  GarmentStatus,
  PaymentStatus,
} from "@prisma/client";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "gold";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-transparent",
  success: "bg-risk-safe/15 text-risk-safe border-transparent",
  warning: "bg-risk-tight/18 text-risk-tight border-transparent",
  danger: "bg-risk-unsafe/15 text-risk-unsafe border-transparent",
  gold: "bg-gold/15 text-gold border-transparent",
};

function Dot({ tone }: { tone: Tone }) {
  const dotClass: Record<Tone, string> = {
    neutral: "bg-muted-foreground",
    info: "bg-blue-500",
    success: "bg-risk-safe",
    warning: "bg-risk-tight",
    danger: "bg-risk-unsafe",
    gold: "bg-gold",
  };
  return <span className={cn("size-1.5 rounded-full", dotClass[tone])} />;
}

function BasePill({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      <Dot tone={tone} />
      {label}
    </span>
  );
}

const GARMENT_STATUS_META: Record<GarmentStatus, { label: string; tone: Tone }> = {
  AVAILABLE: { label: "Available", tone: "success" },
  RESERVED: { label: "Reserved", tone: "info" },
  BOOKED: { label: "Booked", tone: "info" },
  AWAITING_FITTING: { label: "Awaiting Fitting", tone: "info" },
  IN_FITTING: { label: "In Fitting", tone: "info" },
  ALTERATION_REQUIRED: { label: "Alteration Required", tone: "warning" },
  WITH_TAILOR: { label: "With Tailor", tone: "warning" },
  READY_FOR_FITTING: { label: "Ready for Fitting", tone: "info" },
  FINAL_FITTING: { label: "Final Fitting", tone: "info" },
  READY_FOR_PICKUP: { label: "Ready for Pickup", tone: "success" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", tone: "info" },
  WITH_CUSTOMER: { label: "With Customer", tone: "info" },
  RETURNED: { label: "Returned", tone: "neutral" },
  DAMAGE_INSPECTION: { label: "Damage Inspection", tone: "warning" },
  CLEANING_REQUIRED: { label: "Cleaning Required", tone: "warning" },
  CLEANING: { label: "Cleaning", tone: "warning" },
  QUALITY_CHECK: { label: "Quality Check", tone: "warning" },
  REPAIR_REQUIRED: { label: "Repair Required", tone: "warning" },
  UNDER_REPAIR: { label: "Under Repair", tone: "warning" },
  READY_TO_RENT: { label: "Ready to Rent", tone: "success" },
  OUT_OF_SERVICE: { label: "Out of Service", tone: "neutral" },
  SOLD: { label: "Sold", tone: "gold" },
  LOST: { label: "Lost", tone: "danger" },
  DAMAGED: { label: "Damaged", tone: "danger" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

export function GarmentStatusBadge({ status, className }: { status: GarmentStatus; className?: string }) {
  const meta = GARMENT_STATUS_META[status];
  return <BasePill tone={meta.tone} label={meta.label} className={className} />;
}

const BOOKING_STATUS_META: Record<BookingStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  CONFIRMED: { label: "Confirmed", tone: "info" },
  IN_PROGRESS: { label: "In Progress", tone: "gold" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const meta = BOOKING_STATUS_META[status];
  return <BasePill tone={meta.tone} label={meta.label} className={className} />;
}

const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: Tone }> = {
  UNPAID: { label: "Unpaid", tone: "danger" },
  PARTIALLY_PAID: { label: "Partially Paid", tone: "warning" },
  PAID: { label: "Paid", tone: "success" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
  OVERDUE: { label: "Overdue", tone: "danger" },
};

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const meta = PAYMENT_STATUS_META[status];
  return <BasePill tone={meta.tone} label={meta.label} className={className} />;
}

const RISK_META: Record<AvailabilityRisk, { label: string; tone: Tone }> = {
  SAFE: { label: "Safe to Book", tone: "success" },
  TIGHT: { label: "Tight Turnaround", tone: "warning" },
  UNSAFE: { label: "Cannot Book Safely", tone: "danger" },
};

export function RiskBadge({ risk, className }: { risk: AvailabilityRisk; className?: string }) {
  const meta = RISK_META[risk];
  return <BasePill tone={meta.tone} label={meta.label} className={className} />;
}
