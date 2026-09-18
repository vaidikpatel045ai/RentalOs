import { z } from "zod";

export const BOOKING_STATUSES = ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED", "OVERDUE"] as const;

export const bookingItemSchema = z.object({
  garmentId: z.string().min(1),
  priceAtBooking: z.coerce.number().nonnegative(),
  depositAtBooking: z.coerce.number().nonnegative().default(0),
  notes: z.string().trim().optional().or(z.literal("")),
});

export const bookingSchema = z
  .object({
    branchId: z.string().min(1),
    customerId: z.string().min(1, "Select a customer"),
    items: z.array(bookingItemSchema).min(1, "Add at least one garment"),
    rentalStart: z.coerce.date(),
    rentalEnd: z.coerce.date(),
    weddingDate: z.coerce.date().optional().nullable(),
    pickupDate: z.coerce.date().optional().nullable(),
    returnDate: z.coerce.date().optional().nullable(),
    trialDate: z.coerce.date().optional().nullable(),
    fittingDate: z.coerce.date().optional().nullable(),
    deliveryMethod: z
      .enum(["STORE_PICKUP", "STORE_RETURN", "HOME_DELIVERY", "HOME_PICKUP", "COURIER", "EXPRESS"])
      .default("STORE_PICKUP"),
    returnMethod: z
      .enum(["STORE_PICKUP", "STORE_RETURN", "HOME_DELIVERY", "HOME_PICKUP", "COURIER", "EXPRESS"])
      .default("STORE_RETURN"),
    pickupLocation: z.string().trim().optional().or(z.literal("")),
    discount: z.coerce.number().nonnegative().default(0),
    deliveryFee: z.coerce.number().nonnegative().default(0),
    assignedStaffId: z.string().optional().nullable(),
    notes: z.string().trim().optional().or(z.literal("")),
    /** Set true to bypass a TIGHT (not UNSAFE) warning after staff confirms. */
    acknowledgeRisk: z.boolean().default(false),
  })
  .refine((data) => data.rentalEnd > data.rentalStart, {
    message: "Rental end must be after rental start",
    path: ["rentalEnd"],
  });

export type BookingInput = z.input<typeof bookingSchema>;
