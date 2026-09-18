import { z } from "zod";

export const BRANCH_COUNT_OPTIONS = ["1", "2-5", "6+"] as const;

export const inquirySchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(200),
  contactName: z.string().trim().min(1, "Your name is required").max(200),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  branchCount: z.enum(BRANCH_COUNT_OPTIONS).optional(),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  // Honeypot — real visitors never fill this in; a bot filling every field
  // usually does. Silently accepted and dropped rather than erroring, so a
  // bot gets no signal that it was caught.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type InquiryInput = z.input<typeof inquirySchema>;
