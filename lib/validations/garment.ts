import { z } from "zod";

export const GARMENT_CATEGORIES = [
  "BRIDAL_GOWN",
  "RECEPTION_DRESS",
  "BRIDESMAID",
  "EVENING_GOWN",
  "ABAYA",
  "VEIL",
  "JEWELLERY",
  "SHOES",
  "BELT",
  "GLOVES",
  "OVERSKIRT",
  "ACCESSORIES",
  "GROOM_FORMALWEAR",
] as const;

export const GARMENT_STATUSES = [
  "AVAILABLE",
  "RESERVED",
  "BOOKED",
  "AWAITING_FITTING",
  "IN_FITTING",
  "ALTERATION_REQUIRED",
  "WITH_TAILOR",
  "READY_FOR_FITTING",
  "FINAL_FITTING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "WITH_CUSTOMER",
  "RETURNED",
  "DAMAGE_INSPECTION",
  "CLEANING_REQUIRED",
  "CLEANING",
  "QUALITY_CHECK",
  "REPAIR_REQUIRED",
  "UNDER_REPAIR",
  "READY_TO_RENT",
  "OUT_OF_SERVICE",
  "SOLD",
  "LOST",
  "DAMAGED",
  "ARCHIVED",
] as const;

export const garmentSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(2, "SKU is required")
    .regex(/^[A-Z0-9-]+$/, "SKU should be uppercase letters, numbers and dashes, e.g. BR-102"),
  branchId: z.string().min(1, "Branch is required"),
  name: z.string().trim().min(1, "Name is required"),
  category: z.enum(GARMENT_CATEGORIES),
  designer: z.string().trim().optional().or(z.literal("")),
  collection: z.string().trim().optional().or(z.literal("")),
  brand: z.string().trim().optional().or(z.literal("")),
  size: z.string().trim().optional().or(z.literal("")),
  sizeEU: z.string().trim().optional().or(z.literal("")),
  sizeUS: z.string().trim().optional().or(z.literal("")),
  color: z.string().trim().optional().or(z.literal("")),
  fabric: z.string().trim().optional().or(z.literal("")),
  style: z.string().trim().optional().or(z.literal("")),
  season: z.string().trim().optional().or(z.literal("")),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  rentalPrice: z.coerce.number().nonnegative().default(0),
  salePrice: z.coerce.number().nonnegative().optional(),
  securityDeposit: z.coerce.number().nonnegative().default(0),
  purchaseCost: z.coerce.number().nonnegative().default(0),
  replacementValue: z.coerce.number().nonnegative().default(0),
  parentGarmentId: z.string().optional().nullable(),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type GarmentInput = z.input<typeof garmentSchema>;
