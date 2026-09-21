import { z } from "zod";

export const CONDITION_REPORT_TYPES = ["PRE_RENTAL", "POST_RENTAL", "PERIODIC"] as const;

// Mirrors the free-text convention documented on GarmentConditionReport.damageCategories
// in prisma/schema.prisma.
export const DAMAGE_CATEGORIES = [
  "stains",
  "tears",
  "missing_component",
  "broken_zip",
  "embroidery_damage",
  "odor",
  "wear",
  "other",
] as const;

export const conditionReportSchema = z.object({
  reportType: z.enum(CONDITION_REPORT_TYPES),
  bookingId: z.string().trim().optional().or(z.literal("")),
  conditionScore: z.coerce.number().min(0).max(10),
  damageCategories: z.array(z.enum(DAMAGE_CATEGORIES)).default([]),
  description: z.string().trim().optional().or(z.literal("")),
  estimatedCost: z.coerce.number().nonnegative().default(0),
});

export type ConditionReportInput = z.input<typeof conditionReportSchema>;

export const damageChargeSchema = z.object({
  bookingId: z.string().trim().min(1, "Booking is required"),
  conditionReportId: z.string().trim().optional().or(z.literal("")),
  category: z.string().trim().min(1, "Category is required"),
  description: z.string().trim().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
});

export type DamageChargeInput = z.input<typeof damageChargeSchema>;
