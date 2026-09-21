import { z } from "zod";
import { GARMENT_CATEGORIES } from "@/lib/validations/garment";

export const packageSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional().or(z.literal("")),
  price: z.coerce.number().nonnegative(),
});

export type PackageInput = z.input<typeof packageSchema>;

export const packageItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  garmentCategory: z.enum(GARMENT_CATEGORIES).optional().or(z.literal("")),
  quantity: z.coerce.number().int().positive().default(1),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type PackageItemInput = z.input<typeof packageItemSchema>;
