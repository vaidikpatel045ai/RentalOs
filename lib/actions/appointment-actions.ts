"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { permissionError } from "@/lib/permissions";
import { appointmentSchema } from "@/lib/validations/appointment";
import type { ActionState } from "@/lib/actions/customer-actions";

export async function createAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "appointments", "create");
  if (permissionMsg) return { error: permissionMsg };

  const raw = Object.fromEntries(formData.entries());
  const parsed = appointmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.appointment.create({
    data: {
      ...parsed.data,
      bookingId: parsed.data.bookingId || null,
      room: parsed.data.room || null,
      assignedStaffId: parsed.data.assignedStaffId || null,
      notes: parsed.data.notes || null,
    },
  });

  updateTag("dashboard");
  updateTag("calendar");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/calendar");
  redirect(`/dashboard/appointments`);
}
