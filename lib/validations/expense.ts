import { z } from "zod";
import { TRANSACTION_METHODS } from "@/lib/validations/payment";

export const EXPENSE_CATEGORIES = [
  "RENT",
  "SALARIES",
  "UTILITIES",
  "CLEANING_SUPPLIES",
  "ALTERATION_MATERIALS",
  "INVENTORY_PURCHASE",
  "MARKETING",
  "MAINTENANCE",
  "TRANSPORT",
  "FEES_AND_LICENSES",
  "OTHER",
] as const;

export const expenseSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  category: z.enum(EXPENSE_CATEGORIES, { message: "Pick a category" }),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  paymentMethod: z.enum(TRANSACTION_METHODS).default("CASH"),
  vendor: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ExpenseInput = z.input<typeof expenseSchema>;

/** A YYYY-MM-DD date from the form, stored at midday UTC so it never shifts
 * to the neighbouring day when displayed in Gulf or US timezones. */
export function expenseDateFromInput(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}
