import { z } from "zod";
import { GARMENT_CATEGORIES } from "@/lib/validations/garment";

export const PACKAGE_INTENTS = ["draft", "publish"] as const;

/** A draft only needs a name (and its branch); publishing also needs a price. */
export const packageSchema = z
  .object({
    intent: z.enum(PACKAGE_INTENTS).default("publish"),
    branchId: z.string().min(1, "Branch is required"),
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim().optional().or(z.literal("")),
    price: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().nonnegative("Price can't be negative").optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.intent === "publish" && data.price === undefined) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Add a price to publish, or save as a draft" });
    }
  });

export type PackageInput = z.input<typeof packageSchema>;

export const packageItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  garmentCategory: z.enum(GARMENT_CATEGORIES).optional().or(z.literal("")),
  quantity: z.coerce.number().int().positive().default(1),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type PackageItemInput = z.input<typeof packageItemSchema>;
