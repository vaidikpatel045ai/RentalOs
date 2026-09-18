import { z } from "zod";

export const APPOINTMENT_TYPES = [
  "NEW_CONSULTATION",
  "DRESS_SELECTION",
  "FITTING",
  "ALTERATION_FITTING",
  "FINAL_FITTING",
  "PICKUP",
  "RETURN",
  "HOME_FITTING",
  "STYLING",
  "CUSTOMER_SERVICE",
] as const;

export const APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"] as const;

export const appointmentSchema = z.object({
  branchId: z.string().min(1),
  customerId: z.string().min(1, "Select a customer"),
  bookingId: z.string().optional().nullable(),
  type: z.enum(APPOINTMENT_TYPES),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().positive().default(60),
  room: z.string().trim().optional().or(z.literal("")),
  assignedStaffId: z.string().optional().nullable(),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type AppointmentInput = z.input<typeof appointmentSchema>;
