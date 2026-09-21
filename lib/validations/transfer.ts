import { z } from "zod";

export const transferSchema = z.object({
  garmentId: z.string().min(1, "Garment is required"),
  toBranchId: z.string().min(1, "Destination branch is required"),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type TransferInput = z.input<typeof transferSchema>;
