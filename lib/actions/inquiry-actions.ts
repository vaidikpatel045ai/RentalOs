"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { permissionError } from "@/lib/permissions";
import { inquirySchema } from "@/lib/validations/inquiry";
import type { ActionState } from "@/lib/actions/customer-actions";
import type { InquiryStatus } from "@prisma/client";

/**
 * Public — deliberately no auth check. This is the marketing site's "Book a
 * Demo" form; anyone visiting bridalrentalos.ae should be able to submit it
 * without an account.
 */
export async function submitInquiry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Honeypot tripped — pretend success so the bot moves on, but write nothing.
  if (parsed.data.website) {
    return {};
  }

  await db.salesInquiry.create({
    data: {
      businessName: parsed.data.businessName,
      contactName: parsed.data.contactName,
      email: parsed.data.email.toLowerCase().trim(),
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      branchCount: parsed.data.branchCount || null,
      message: parsed.data.message || null,
    },
  });

  updateTag("inquiries");
  return {};
}

export async function updateInquiryStatus(inquiryId: string, status: InquiryStatus): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "inquiries", "update");
  if (permissionMsg) return { error: permissionMsg };

  await db.salesInquiry.update({ where: { id: inquiryId }, data: { status } });

  updateTag("inquiries");
  revalidatePath("/dashboard/inquiries");
  return {};
}
