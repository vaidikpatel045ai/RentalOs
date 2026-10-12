"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { notifyUser, notifyUsers } from "@/lib/notify";
import { escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { trustedAppUrl } from "@/lib/app-url";
import { SUPPORT_MESSAGE_MAX, findViewableTicket, getSupportContacts } from "@/lib/support";

export type SupportFormState = { error?: string; fieldErrors?: Record<string, string[] | undefined>; ok?: boolean };

const messageSchema = z.string().trim().min(1, "Write a message").max(SUPPORT_MESSAGE_MAX, "That message is too long");
const phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Use international format, e.g. +919876543210")
  .optional()
  .or(z.literal(""));

const settingsSchema = z.object({
  supportEmail: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  supportPhone: phone,
  supportWhatsapp: phone,
  supportHours: z.string().trim().max(120).optional().or(z.literal("")),
});

/** Platform Admin: the contact details boutiques see on Help & Support. */
export async function updateSupportSettings(_prev: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") return { error: "Not allowed." };

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  const data = {
    supportEmail: d.supportEmail || null,
    supportPhone: d.supportPhone || null,
    supportWhatsapp: d.supportWhatsapp || null,
    supportHours: d.supportHours || null,
  };
  await db.platformSettings.upsert({ where: { id: "platform" }, create: { id: "platform", ...data }, update: data });

  revalidatePath("/admin/settings");
  revalidatePath("/dashboard/support");
  return { ok: true };
}

/** Lets the platform team know: an in-app notification for every Platform
 * Admin, plus an email to the support address when email is set up. */
async function alertPlatform(ticket: { id: string; subject: string }, boutique: string, author: string, body: string) {
  const admins = await db.user.findMany({ where: { role: "PLATFORM_ADMIN", isActive: true }, select: { id: true } });
  await notifyUsers(
    admins.map((a) => a.id),
    {
      type: "SUPPORT_MESSAGE",
      title: `${boutique}: ${ticket.subject}`,
      body: body.slice(0, 140),
      relatedEntityType: "SupportTicket",
      relatedEntityId: ticket.id,
    }
  );

  const { email } = await getSupportContacts();
  const base = trustedAppUrl();
  if (!email || !isEmailConfigured()) return;
  const link = base ? `${base}/admin/support/${ticket.id}` : null;
  const text = [`${author} (${boutique}) wrote:`, "", body, "", link ? `Reply: ${link}` : ""].join("\n");
  // Best effort: the message is saved either way, so a failed email isn't an error for the boutique.
  await sendEmail({
    to: email,
    subject: `[Support] ${boutique}: ${ticket.subject}`,
    text,
    html: `<p><strong>${escapeHtml(author)}</strong> (${escapeHtml(boutique)}) wrote:</p><p style="white-space:pre-wrap">${escapeHtml(body)}</p>${link ? `<p><a href="${link}">Reply in the admin console</a></p>` : ""}`,
  }).catch(() => undefined);
}

/** Boutique owner/manager starts a conversation with the platform team. */
export async function createSupportTicket(_prev: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support", "create") || !session.user.organizationId) {
    return { error: "Only the owner or a manager can contact support." };
  }
  const subject = z.string().trim().min(3, "Add a short subject").max(120).safeParse(formData.get("subject"));
  const body = messageSchema.safeParse(formData.get("message"));
  if (!subject.success || !body.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: {
        subject: subject.success ? undefined : subject.error.issues.map((i) => i.message),
        message: body.success ? undefined : body.error.issues.map((i) => i.message),
      },
    };
  }

  const ticket = await db.supportTicket.create({
    data: {
      organizationId: session.user.organizationId,
      createdByUserId: session.user.id,
      subject: subject.data,
      unreadByPlatform: true,
      messages: { create: { authorUserId: session.user.id, body: body.data } },
    },
    include: { organization: { select: { name: true } } },
  });
  await alertPlatform(ticket, ticket.organization.name, session.user.name ?? "A user", body.data);

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  redirect(`/dashboard/support/${ticket.id}`);
}

/** Adds a message to a conversation, from either side. */
export async function sendSupportMessage(ticketId: string, _prev: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Your session has ended. Please sign in again." };
  const ticket = await findViewableTicket(session.user, ticketId);
  if (!ticket) return { error: "Conversation not found." };

  const body = messageSchema.safeParse(formData.get("message"));
  if (!body.success) return { error: body.error.issues[0]?.message ?? "Write a message" };

  const fromPlatform = session.user.role === "PLATFORM_ADMIN";
  await db.$transaction([
    db.supportMessage.create({ data: { ticketId, authorUserId: session.user.id, fromPlatform, body: body.data } }),
    db.supportTicket.update({
      where: { id: ticketId },
      data: {
        lastMessageAt: new Date(),
        // A new message reopens a resolved conversation and marks it unread for the other side.
        status: "OPEN",
        ...(fromPlatform ? { unreadByBoutique: true, unreadByPlatform: false } : { unreadByPlatform: true, unreadByBoutique: false }),
      },
    }),
  ]);

  if (fromPlatform) {
    await notifyUser(ticket.createdByUserId, {
      type: "SUPPORT_REPLY",
      title: `Support replied: ${ticket.subject}`,
      body: body.data.slice(0, 140),
      relatedEntityType: "SupportTicket",
      relatedEntityId: ticket.id,
    });
  } else {
    await alertPlatform(ticket, ticket.organization.name, session.user.name ?? "A user", body.data);
  }

  revalidatePath(`/dashboard/support/${ticketId}`);
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  return { ok: true };
}

/** Marks a conversation resolved, or reopens it. Either side may. */
export async function setSupportTicketStatus(ticketId: string, status: "OPEN" | "RESOLVED") {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const ticket = await findViewableTicket(session.user, ticketId);
  if (!ticket) throw new Error("Conversation not found.");

  await db.supportTicket.update({ where: { id: ticketId }, data: { status } });
  revalidatePath(`/dashboard/support/${ticketId}`);
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
}
