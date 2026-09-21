"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCan, permissionError } from "@/lib/permissions";
import { documentUploadSchema } from "@/lib/validations/document";
import { getStorageAdapter } from "@/lib/storage";
import type { ActionState } from "@/lib/actions/customer-actions";

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const permissionMsg = permissionError(session.user.role, "documents", "create");
  if (permissionMsg) return { error: permissionMsg };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a file." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = documentUploadSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (!parsed.data.customerId && !parsed.data.bookingId && !parsed.data.garmentId) {
    return { error: "Document must be linked to a customer, booking, or garment." };
  }

  const entityFolder = parsed.data.customerId
    ? `customers/${parsed.data.customerId}`
    : parsed.data.bookingId
      ? `bookings/${parsed.data.bookingId}`
      : `garments/${parsed.data.garmentId}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageAdapter();
  const { url } = await storage.uploadFile(buffer, {
    filename: file.name,
    contentType: file.type,
    folder: `documents/${entityFolder}`,
  });

  await db.document.create({
    data: {
      type: parsed.data.type,
      fileUrl: url,
      fileName: file.name,
      customerId: parsed.data.customerId || null,
      bookingId: parsed.data.bookingId || null,
      garmentId: parsed.data.garmentId || null,
      uploadedByUserId: session.user.id,
    },
  });

  if (parsed.data.customerId) revalidatePath(`/dashboard/customers/${parsed.data.customerId}`);
  if (parsed.data.bookingId) revalidatePath(`/dashboard/bookings/${parsed.data.bookingId}`);
  return {};
}

export async function deleteDocument(id: string, revalidatePathTarget: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requireCan(session.user.role, "documents", "delete");

  await db.document.delete({ where: { id } });
  revalidatePath(revalidatePathTarget);
}
