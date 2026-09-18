import { z } from "zod";

// E.164-ish international phone: + followed by 7-15 digits. Not UAE-only —
// keeps the door open for US numbers (+1...) without a schema change.
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Enter phone in international format, e.g. +971501234567");

export const customerSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: phoneSchema,
  whatsapp: phoneSchema.optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  nationality: z.string().trim().optional().or(z.literal("")),
  preferredLanguage: z.enum(["EN", "AR", "HI", "UR"]).default("EN"),
  weddingDate: z.coerce.date().optional().nullable(),
  weddingVenue: z.string().trim().optional().or(z.literal("")),
  eventType: z.string().trim().optional().or(z.literal("")),
  favoriteDesigners: z.array(z.string()).default([]),
  stylePreferences: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type CustomerInput = z.input<typeof customerSchema>;

export const measurementSchema = z.object({
  customerId: z.string().min(1),
  unit: z.enum(["cm", "in"]).default("cm"),
  bust: z.coerce.number().positive().optional(),
  underbust: z.coerce.number().positive().optional(),
  waist: z.coerce.number().positive().optional(),
  hip: z.coerce.number().positive().optional(),
  shoulder: z.coerce.number().positive().optional(),
  armhole: z.coerce.number().positive().optional(),
  sleeve: z.coerce.number().positive().optional(),
  bicep: z.coerce.number().positive().optional(),
  blouseLength: z.coerce.number().positive().optional(),
  frontLength: z.coerce.number().positive().optional(),
  backLength: z.coerce.number().positive().optional(),
  hollowToHem: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  heelHeight: z.coerce.number().positive().optional(),
  lehengaWaist: z.coerce.number().positive().optional(),
  lehengaLength: z.coerce.number().positive().optional(),
  trainLength: z.coerce.number().positive().optional(),
  verified: z.boolean().default(false),
});

export type MeasurementInput = z.input<typeof measurementSchema>;
