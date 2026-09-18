import { z } from "zod";

export const TAILORING_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TAILORING_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "IN_PROGRESS",
  "READY_FOR_FITTING",
  "FITTING_FEEDBACK",
  "REVISION_REQUIRED",
  "COMPLETED",
] as const;

/** The common linear path a job takes when nothing goes wrong — drives the
 * portal's single "next step" button. FITTING_FEEDBACK/REVISION_REQUIRED
 * are reachable only via the full status dropdown (they're exceptions, not
 * a forward step). */
export const TAILORING_HAPPY_PATH = ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "READY_FOR_FITTING", "COMPLETED"] as const;
export const TAILORING_NEXT_ACTION_LABEL: Record<(typeof TAILORING_STATUSES)[number], string> = {
  ASSIGNED: "Accept Job",
  ACCEPTED: "Start Work",
  IN_PROGRESS: "Mark Ready for Fitting",
  READY_FOR_FITTING: "Mark Completed",
  FITTING_FEEDBACK: "Mark Completed",
  REVISION_REQUIRED: "Resume Work",
  COMPLETED: "Completed",
};

type TailoringStatusValue = (typeof TAILORING_STATUSES)[number];

/** The status the primary portal button should move a job to next. */
export function nextTailoringStatus(current: TailoringStatusValue): TailoringStatusValue | null {
  if (current === "REVISION_REQUIRED") return "IN_PROGRESS";
  if (current === "FITTING_FEEDBACK") return "COMPLETED";
  if (current === "COMPLETED") return null;
  const idx = TAILORING_HAPPY_PATH.indexOf(current as (typeof TAILORING_HAPPY_PATH)[number]);
  return idx >= 0 && idx < TAILORING_HAPPY_PATH.length - 1 ? TAILORING_HAPPY_PATH[idx + 1] : null;
}

export const tailoringJobSchema = z.object({
  branchId: z.string().min(1),
  garmentId: z.string().min(1, "Select a garment"),
  customerId: z.string().optional().nullable(),
  bookingId: z.string().optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
  priority: z.enum(TAILORING_PRIORITIES).default("MEDIUM"),
  dueAt: z.coerce.date().optional().nullable(),
  hem: z.string().trim().optional().or(z.literal("")),
  bust: z.string().trim().optional().or(z.literal("")),
  waist: z.string().trim().optional().or(z.literal("")),
  straps: z.string().trim().optional().or(z.literal("")),
  length: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});
export type TailoringJobInput = z.input<typeof tailoringJobSchema>;

export const CLEANING_TYPES = [
  "DRY_CLEAN",
  "STEAM",
  "HAND_WASH",
  "SPOT_CLEAN",
  "STAIN_REMOVAL",
  "DELICATE_CARE",
  "ODOR_TREATMENT",
  "EMERGENCY",
] as const;
export const CLEANING_STATUSES = [
  "RECEIVED",
  "INSPECTION",
  "CLEANING",
  "DRYING",
  "FINISHING",
  "QUALITY_CHECK",
  "READY",
  "FAILED_QC",
  "RE_CLEAN",
  "COMPLETED",
] as const;

export const CLEANING_HAPPY_PATH = [
  "RECEIVED",
  "INSPECTION",
  "CLEANING",
  "DRYING",
  "FINISHING",
  "QUALITY_CHECK",
  "READY",
] as const;
export const CLEANING_NEXT_ACTION_LABEL: Record<(typeof CLEANING_STATUSES)[number], string> = {
  RECEIVED: "Start Inspection",
  INSPECTION: "Begin Cleaning",
  CLEANING: "Move to Drying",
  DRYING: "Move to Finishing",
  FINISHING: "Send to Quality Check",
  QUALITY_CHECK: "Pass — Mark Ready",
  READY: "Complete Job",
  FAILED_QC: "Send for Re-clean",
  RE_CLEAN: "Back to Cleaning",
  COMPLETED: "Completed",
};

type CleaningStatusValue = (typeof CLEANING_STATUSES)[number];

export function nextCleaningStatus(current: CleaningStatusValue): CleaningStatusValue | null {
  if (current === "FAILED_QC") return "RE_CLEAN";
  if (current === "RE_CLEAN") return "CLEANING";
  if (current === "READY") return "COMPLETED";
  if (current === "COMPLETED") return null;
  const idx = CLEANING_HAPPY_PATH.indexOf(current as (typeof CLEANING_HAPPY_PATH)[number]);
  return idx >= 0 && idx < CLEANING_HAPPY_PATH.length - 1 ? CLEANING_HAPPY_PATH[idx + 1] : null;
}

export const cleaningJobSchema = z.object({
  branchId: z.string().min(1),
  garmentId: z.string().min(1, "Select a garment"),
  bookingId: z.string().optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
  cleaningType: z.enum(CLEANING_TYPES).default("DRY_CLEAN"),
  priority: z.enum(TAILORING_PRIORITIES).default("MEDIUM"),
  dueAt: z.coerce.date().optional().nullable(),
  stainNotes: z.string().trim().optional().or(z.literal("")),
  instructions: z.string().trim().optional().or(z.literal("")),
});
export type CleaningJobInput = z.input<typeof cleaningJobSchema>;

export const DELIVERY_METHODS = ["STORE_PICKUP", "STORE_RETURN", "HOME_DELIVERY", "HOME_PICKUP", "COURIER", "EXPRESS"] as const;
export const DELIVERY_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "RESCHEDULED", "RETURNED"] as const;

export const deliveryJobSchema = z.object({
  bookingId: z.string().min(1, "Select a booking"),
  type: z.enum(DELIVERY_METHODS).default("HOME_DELIVERY"),
  assignedDriverId: z.string().optional().nullable(),
  address: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  scheduledDate: z.coerce.date().optional().nullable(),
  windowStart: z.coerce.date().optional().nullable(),
  windowEnd: z.coerce.date().optional().nullable(),
  notes: z.string().trim().optional().or(z.literal("")),
});
export type DeliveryJobInput = z.input<typeof deliveryJobSchema>;
