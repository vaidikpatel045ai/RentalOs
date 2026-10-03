import { z } from "zod";

export const BILLING_INTERVALS = ["ONE_TIME", "MONTHLY"] as const;

export const planSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  billingInterval: z.enum(BILLING_INTERVALS),
  price: z.coerce.number().nonnegative(),
  currency: z.string().trim().min(1).default("AED"),
  maxBranches: z.coerce.number().int().positive().optional(),
});

export type PlanInput = z.input<typeof planSchema>;
