"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { PhotoShootStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, permissionError, type Action } from "@/lib/permissions";
import { notifyUser, notifyUsers } from "@/lib/notify";
import { canUseBranch, reachCustomer, reachBooking, type ScopeUser } from "@/lib/scope";
import {
  PHOTOGRAPHY_OFF_MESSAGE,
  isPhotographyEnabled,
  nextShootNumber,
  reachPhotoService,
  reachPhotoShoot,
  reachPhotographer,
  shootBalance,
} from "@/lib/photography";
import {
  PHOTOGRAPHER_STATUSES,
  galleryUrlSchema,
  photoServiceSchema,
  photoShootSchema,
  shootPaymentSchema,
  shootRequestSchema,
} from "@/lib/validations/photography";
import type { ActionState } from "@/lib/actions/customer-actions";
import { getCachedBranchById } from "@/lib/queries/branches";

/** "21 Nov 2026, 15:00" in the branch's own timezone (the server runs on UTC). */
async function whenAt(date: Date, branchId: string) {
  const branch = await getCachedBranchById(branchId);
  return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: branch?.timezone ?? "Asia/Dubai" });
}

type Guarded = { user: ScopeUser & { name?: string | null }; error?: undefined } | { user?: undefined; error: string };

/** Signed in, module switched on for the boutique, and allowed to do `action`. */
async function guard(action: Action, resource: "photography" | "payments" = "photography"): Promise<Guarded> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  if (!(await isPhotographyEnabled(session.user.organizationId))) return { error: PHOTOGRAPHY_OFF_MESSAGE };
  const permissionMsg = permissionError(session.user.role, resource, action);
  if (permissionMsg) return { error: permissionMsg };
  return { user: session.user };
}

function revalidateShoot(id?: string) {
  updateTag("calendar");
  revalidatePath("/dashboard/photography");
  if (id) revalidatePath(`/dashboard/photography/${id}`);
  revalidatePath("/portal/photographer");
  revalidatePath("/portal/customer");
}

const formObject = (formData: FormData) => Object.fromEntries(formData.entries());

// ─────────────────────────────────────────────────────────────────────────
// Services (the catalogue of shoots a branch offers)
// ─────────────────────────────────────────────────────────────────────────

export async function createPhotoService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const g = await guard("create");
  if (!g.user) return { error: g.error };
  const parsed = photoServiceSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  if (!(await canUseBranch(g.user, parsed.data.branchId))) return { error: "Choose one of your branches." };

  await db.photoService.create({
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      deliverables: parsed.data.deliverables || null,
    },
  });
  revalidatePath("/dashboard/photography/services");
  redirect("/dashboard/photography/services");
}

export async function updatePhotoService(serviceId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const g = await guard("update");
  if (!g.user) return { error: g.error };
  if (!(await reachPhotoService(g.user, serviceId))) return { error: "Service not found." };
  const parsed = photoServiceSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  if (!(await canUseBranch(g.user, parsed.data.branchId))) return { error: "Choose one of your branches." };

  await db.photoService.update({
    where: { id: serviceId },
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      deliverables: parsed.data.deliverables || null,
    },
  });
  revalidatePath("/dashboard/photography/services");
  redirect("/dashboard/photography/services");
}

export async function togglePhotoServiceActive(serviceId: string, isActive: boolean): Promise<ActionState> {
  const g = await guard("update");
  if (!g.user) return { error: g.error };
  if (!(await reachPhotoService(g.user, serviceId))) return { error: "Service not found." };
  await db.photoService.update({ where: { id: serviceId }, data: { isActive } });
  revalidatePath("/dashboard/photography/services");
  return {};
}

// ─────────────────────────────────────────────────────────────────────────
// Shoots
// ─────────────────────────────────────────────────────────────────────────

/** Checks every id a shoot form sends. Returns an error message or null. */
async function checkShootInputs(user: ScopeUser, data: { branchId: string; customerId: string; serviceId?: string; photographerId?: string; bookingId?: string }) {
  if (!(await canUseBranch(user, data.branchId))) return "Choose one of your branches.";
  if (!(await reachCustomer(user, data.customerId))) return "Client not found.";
  if (data.serviceId && !(await reachPhotoService(user, data.serviceId))) return "Service not found.";
  if (data.photographerId && !(await reachPhotographer(user, data.photographerId, data.branchId))) {
    return "Choose a photographer from this branch.";
  }
  if (data.bookingId && !(await reachBooking(user, data.bookingId))) return "Booking not found.";
  return null;
}

async function notifyPhotographer(photographerId: string, shoot: { id: string; shootNumber: string; scheduledAt: Date; branchId: string }) {
  await notifyUser(photographerId, {
    type: "PHOTOSHOOT_ASSIGNED",
    title: `New shoot assigned: ${shoot.shootNumber}`,
    body: await whenAt(shoot.scheduledAt, shoot.branchId),
    relatedEntityType: "PhotoShoot",
    relatedEntityId: shoot.id,
  });
}

export async function createPhotoShoot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const g = await guard("create");
  if (!g.user) return { error: g.error };
  const parsed = photoShootSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  const bookingId = (formData.get("bookingId") as string | null) || undefined;
  const scopeError = await checkShootInputs(g.user, {
    branchId: data.branchId,
    customerId: data.customerId,
    serviceId: data.serviceId || undefined,
    photographerId: data.photographerId || undefined,
    bookingId,
  });
  if (scopeError) return { error: scopeError };
  if (data.discount > data.price) return { error: "The discount can't be more than the price." };

  let shoot = null;
  // Retry the rare case of two shoots taking the same number at once.
  for (let attempt = 0; attempt < 3 && !shoot; attempt++) {
    try {
      shoot = await db.photoShoot.create({
        data: {
          shootNumber: await nextShootNumber(),
          branchId: data.branchId,
          customerId: data.customerId,
          serviceId: data.serviceId || null,
          photographerId: data.photographerId || null,
          bookingId: bookingId ?? null,
          type: data.type,
          status: "BOOKED",
          scheduledAt: data.scheduledAt,
          durationMinutes: data.durationMinutes,
          location: data.location || null,
          price: data.price,
          discount: data.discount,
          notes: data.notes || null,
          createdByUserId: g.user.id,
        },
      });
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  if (!shoot) return { error: "Could not book the shoot. Try again." };

  if (shoot.photographerId) await notifyPhotographer(shoot.photographerId, shoot);
  revalidateShoot();
  redirect(`/dashboard/photography/${shoot.id}`);
}

export async function updatePhotoShoot(shootId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const g = await guard("update");
  if (!g.user) return { error: g.error };
  if (g.user.role === "PHOTOGRAPHER") return { error: "Ask the boutique to change the shoot details." };
  const existing = await reachPhotoShoot(g.user, shootId);
  if (!existing) return { error: "Shoot not found." };
  const parsed = photoShootSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  const scopeError = await checkShootInputs(g.user, {
    branchId: data.branchId,
    customerId: data.customerId,
    serviceId: data.serviceId || undefined,
    photographerId: data.photographerId || undefined,
  });
  if (scopeError) return { error: scopeError };
  if (data.discount > data.price) return { error: "The discount can't be more than the price." };

  const before = await db.photoShoot.findUniqueOrThrow({ where: { id: shootId } });
  const shoot = await db.photoShoot.update({
    where: { id: shootId },
    data: {
      branchId: data.branchId,
      customerId: data.customerId,
      serviceId: data.serviceId || null,
      photographerId: data.photographerId || null,
      type: data.type,
      scheduledAt: data.scheduledAt,
      durationMinutes: data.durationMinutes,
      location: data.location || null,
      price: data.price,
      discount: data.discount,
      notes: data.notes || null,
    },
  });
  if (shoot.photographerId && shoot.photographerId !== before.photographerId) await notifyPhotographer(shoot.photographerId, shoot);

  revalidateShoot(shootId);
  redirect(`/dashboard/photography/${shootId}`);
}

/**
 * Moves a shoot along. The back office can set any status (confirming a
 * client request, cancelling). A photographer only moves their own shoot
 * forward through Shot → Editing → Delivered, and delivering needs a
 * gallery link so the client has somewhere to get the photos.
 */
export async function setPhotoShootStatus(shootId: string, status: PhotoShootStatus): Promise<ActionState> {
  const g = await guard("update");
  if (!g.user) return { error: g.error };
  if (!(await reachPhotoShoot(g.user, shootId))) return { error: "Shoot not found." };
  if (g.user.role === "PHOTOGRAPHER" && !(PHOTOGRAPHER_STATUSES as readonly string[]).includes(status)) {
    return { error: "Photographers can mark a shoot shot, in editing or delivered." };
  }

  const shoot = await db.photoShoot.findUniqueOrThrow({ where: { id: shootId }, include: { customer: true } });
  if (status === "DELIVERED" && !shoot.galleryUrl) return { error: "Add the gallery link before marking the photos delivered." };
  if (shoot.status === "CANCELLED" && g.user.role === "PHOTOGRAPHER") return { error: "This shoot was cancelled." };

  await db.photoShoot.update({
    where: { id: shootId },
    data: { status, deliveredAt: status === "DELIVERED" ? new Date() : status === shoot.status ? undefined : null },
  });

  // Tell the client when it matters to them.
  if (shoot.customer.userId && (status === "DELIVERED" || (status === "BOOKED" && shoot.status === "REQUESTED"))) {
    await notifyUser(shoot.customer.userId, {
      type: status === "DELIVERED" ? "PHOTOSHOOT_DELIVERED" : "PHOTOSHOOT_CONFIRMED",
      title: status === "DELIVERED" ? "Your photos are ready" : "Your photoshoot is confirmed",
      body: status === "DELIVERED" ? "Open your portal to see the gallery." : await whenAt(shoot.scheduledAt, shoot.branchId),
      relatedEntityType: "PhotoShoot",
      relatedEntityId: shoot.id,
    });
  }

  revalidateShoot(shootId);
  return {};
}

/** The photographer (or back office) saves the gallery link and editing notes. */
export async function updateShootDelivery(shootId: string, input: { galleryUrl?: string; photographerNotes?: string }): Promise<ActionState> {
  const g = await guard("update");
  if (!g.user) return { error: g.error };
  if (!(await reachPhotoShoot(g.user, shootId))) return { error: "Shoot not found." };

  let galleryUrl: string | null | undefined;
  if (input.galleryUrl !== undefined) {
    if (input.galleryUrl.trim() === "") galleryUrl = null;
    else {
      const parsed = galleryUrlSchema.safeParse(input.galleryUrl);
      if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid link" };
      galleryUrl = parsed.data;
    }
  }

  await db.photoShoot.update({
    where: { id: shootId },
    data: {
      ...(galleryUrl !== undefined ? { galleryUrl } : {}),
      ...(input.photographerNotes !== undefined ? { photographerNotes: input.photographerNotes.trim() || null } : {}),
    },
  });
  revalidateShoot(shootId);
  return {};
}

export async function recordShootPayment(shootId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const g = await guard("create", "payments");
  if (!g.user) return { error: g.error };
  if (!can(g.user.role, "photography", "update")) return { error: "You don't have access to photography." };
  if (!(await reachPhotoShoot(g.user, shootId))) return { error: "Shoot not found." };
  const parsed = shootPaymentSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };

  const shoot = await db.photoShoot.findUniqueOrThrow({ where: { id: shootId } });
  const balance = shootBalance(shoot);
  if (parsed.data.amount > balance + 0.001) return { error: `That's more than the balance of ${balance.toFixed(2)}.` };

  await db.$transaction([
    db.photoShootPayment.create({
      data: {
        shootId,
        amount: parsed.data.amount,
        method: parsed.data.method,
        reference: parsed.data.reference || null,
        receivedByUserId: g.user.id,
      },
    }),
    db.photoShoot.update({ where: { id: shootId }, data: { paidAmount: { increment: parsed.data.amount } } }),
  ]);

  updateTag("profit-loss");
  revalidateShoot(shootId);
  return {};
}

// ─────────────────────────────────────────────────────────────────────────
// Client request from the customer portal
// ─────────────────────────────────────────────────────────────────────────

export async function requestPhotoShoot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") return { error: "Not authenticated" };
  if (!(await isPhotographyEnabled(session.user.organizationId))) return { error: PHOTOGRAPHY_OFF_MESSAGE };

  const parsed = shootRequestSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  if (parsed.data.preferredAt.getTime() < Date.now()) return { error: "Choose a date in the future." };

  const customer = await db.customer.findFirst({ where: { userId: session.user.id } });
  if (!customer) return { error: "We couldn't find your client record. Please contact the boutique." };
  // Only the active shoots of the client's own branch.
  const service = await db.photoService.findFirst({
    where: { id: parsed.data.serviceId, branchId: customer.branchId, isActive: true },
  });
  if (!service) return { error: "That shoot isn't available. Choose another." };

  const openRequests = await db.photoShoot.count({ where: { customerId: customer.id, status: "REQUESTED" } });
  if (openRequests >= 3) return { error: "You already have requests waiting. The boutique will be in touch soon." };

  const shoot = await db.photoShoot.create({
    data: {
      shootNumber: await nextShootNumber(),
      branchId: customer.branchId,
      customerId: customer.id,
      serviceId: service.id,
      type: service.type,
      status: "REQUESTED",
      scheduledAt: parsed.data.preferredAt,
      durationMinutes: service.durationMinutes,
      price: service.price,
      notes: parsed.data.notes || null,
    },
  });

  const branch = await db.branch.findUniqueOrThrow({ where: { id: customer.branchId }, select: { organizationId: true } });
  const staff = await db.user.findMany({
    where: {
      organizationId: branch.organizationId,
      isActive: true,
      OR: [{ role: "OWNER" }, { role: { in: ["MANAGER", "SALES"] }, OR: [{ branchId: customer.branchId }, { branchId: null }] }],
    },
    select: { id: true },
  });
  await notifyUsers(
    staff.map((u) => u.id),
    {
      type: "PHOTOSHOOT_REQUESTED",
      title: `Photoshoot request: ${customer.firstName} ${customer.lastName}`,
      body: `${service.name}, preferred ${await whenAt(parsed.data.preferredAt, customer.branchId)}`,
      relatedEntityType: "PhotoShoot",
      relatedEntityId: shoot.id,
    }
  );

  revalidateShoot();
  return {};
}
