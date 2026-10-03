import { z } from "zod";
import { branchSchema } from "@/lib/validations/branch";

export const ORGANIZATION_STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"] as const;

/** Onboarding a new boutique creates the Organization, its first Owner
 * account and its first Branch all in one step — reuses branchSchema
 * directly for the branch portion rather than redefining those fields. */
export const organizationOnboardSchema = z
  .object({
    organizationName: z.string().trim().min(1, "Boutique name is required"),
    planId: z.string().trim().optional().or(z.literal("")),
    ownerName: z.string().trim().min(1, "Owner name is required"),
    ownerEmail: z.string().trim().email("Enter a valid email"),
    ownerPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .merge(branchSchema);

export type OrganizationOnboardInput = z.input<typeof organizationOnboardSchema>;

export const organizationBillingSchema = z.object({
  planId: z.string().trim().optional().or(z.literal("")),
  status: z.enum(ORGANIZATION_STATUSES),
  billingNotes: z.string().trim().optional().or(z.literal("")),
});

export type OrganizationBillingInput = z.input<typeof organizationBillingSchema>;
