import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  contactName: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type SupplierInput = z.input<typeof supplierSchema>;
