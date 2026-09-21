import { z } from "zod";

export const DOCUMENT_TYPES = ["ID", "CONTRACT", "RECEIPT", "CONSENT", "OTHER"] as const;

export const documentUploadSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  customerId: z.string().trim().optional().or(z.literal("")),
  bookingId: z.string().trim().optional().or(z.literal("")),
  garmentId: z.string().trim().optional().or(z.literal("")),
});

export type DocumentUploadInput = z.input<typeof documentUploadSchema>;
