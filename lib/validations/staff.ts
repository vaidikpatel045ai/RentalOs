import { z } from "zod";

export const STAFF_ROLES = ["OWNER", "MANAGER", "SALES", "STYLIST", "TAILOR", "CLEANER", "DELIVERY"] as const;

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Enter phone in international format, e.g. +971501234567")
  .optional()
  .or(z.literal(""));

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(STAFF_ROLES),
  branchId: z.string().optional().nullable(),
  phone: phoneSchema,
  employeeCode: z.string().trim().min(1, "Employee code is required"),
  title: z.string().trim().optional().or(z.literal("")),
  department: z.string().trim().optional().or(z.literal("")),
});
export type CreateStaffInput = z.input<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(STAFF_ROLES),
  branchId: z.string().optional().nullable(),
  phone: phoneSchema,
  employeeCode: z.string().trim().min(1, "Employee code is required"),
  title: z.string().trim().optional().or(z.literal("")),
  department: z.string().trim().optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
  newPassword: z.union([z.string().min(8, "At least 8 characters"), z.literal("")]).optional(),
});
export type UpdateStaffInput = z.input<typeof updateStaffSchema>;
