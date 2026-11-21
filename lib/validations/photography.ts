import { z } from "zod";

export const PHOTO_SHOOT_TYPES = [
  "PRE_WEDDING",
  "BRIDAL",
  "ENGAGEMENT",
  "WEDDING_DAY",
  "MATERNITY",
  "FAMILY",
  "EVENT",
  "OTHER",
] as const;

export const PHOTO_SHOOT_STATUSES = ["REQUESTED", "BOOKED", "SHOT", "EDITING", "DELIVERED", "CANCELLED"] as const;

/** The order a shoot normally moves through; CANCELLED can happen from any open step. */
export const PHOTOGRAPHER_STATUSES = ["SHOT", "EDITING", "DELIVERED"] as const;

const optionalText = z.string().trim().optional().or(z.literal(""));
const money = z.coerce.number().nonnegative("Can't be negative");

export const photoServiceSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(PHOTO_SHOOT_TYPES),
  description: optionalText,
  deliverables: optionalText,
  price: money,
  durationMinutes: z.coerce.number().int().min(15, "At least 15 minutes").max(24 * 60),
});
export type PhotoServiceInput = z.input<typeof photoServiceSchema>;

export const photoShootSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  customerId: z.string().min(1, "Select a client"),
  serviceId: z.string().optional().or(z.literal("")),
  photographerId: z.string().optional().or(z.literal("")),
  type: z.enum(PHOTO_SHOOT_TYPES),
  scheduledAt: z.coerce.date({ message: "Pick a date and time" }),
  durationMinutes: z.coerce.number().int().min(15, "At least 15 minutes").max(24 * 60),
  location: optionalText,
  price: money,
  discount: money.default(0),
  notes: optionalText,
});
export type PhotoShootInput = z.input<typeof photoShootSchema>;

export const shootPaymentSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount"),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "ONLINE", "CHEQUE", "OTHER"]),
  reference: optionalText,
});

export const galleryUrlSchema = z
  .string()
  .trim()
  .url("Enter a full link, starting with https://")
  .refine((u) => /^https?:\/\//i.test(u), "Enter a full link, starting with https://");

/** A client asking for a shoot from their portal. */
export const shootRequestSchema = z.object({
  serviceId: z.string().min(1, "Choose a shoot"),
  preferredAt: z.coerce.date({ message: "Pick a preferred date" }),
  notes: optionalText,
});
