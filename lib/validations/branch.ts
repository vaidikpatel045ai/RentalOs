import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z
    .string()
    .trim()
    .min(2, "Code is required")
    .regex(/^[A-Z0-9]+$/, "Code should be uppercase letters/numbers, e.g. DXB"),
  country: z.string().trim().length(2, "Use a 2-letter ISO country code, e.g. AE").default("AE"),
  currency: z.string().trim().length(3, "Use a 3-letter ISO currency code, e.g. AED").default("AED"),
  timezone: z.string().trim().min(1).default("Asia/Dubai"),
  locale: z.string().trim().min(1).default("en-AE"),
  taxLabel: z.string().trim().min(1).default("VAT"),
  taxRate: z.coerce.number().min(0).max(100).default(5),
  city: z.string().trim().optional().or(z.literal("")),
  stateOrRegion: z.string().trim().optional().or(z.literal("")),
  addressLine1: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
});
export type BranchInput = z.input<typeof branchSchema>;

export const branchSettingsSchema = z.object({
  branchId: z.string().min(1),
  inspectionBufferHours: z.coerce.number().int().min(0).max(240),
  cleaningBufferHours: z.coerce.number().int().min(0).max(240),
  repairBufferHours: z.coerce.number().int().min(0).max(240),
  qualityCheckBufferHours: z.coerce.number().int().min(0).max(240),
  tightThresholdHours: z.coerce.number().int().min(0).max(720),
  taxRate: z.coerce.number().min(0).max(100),
  taxLabel: z.string().trim().min(1),
});
export type BranchSettingsInput = z.input<typeof branchSettingsSchema>;
