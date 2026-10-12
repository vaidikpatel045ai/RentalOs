import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

export const SUPPORT_MESSAGE_MAX = 4000;

/** The Platform Admin's contact details shown to boutiques. */
export async function getSupportContacts() {
  const s = await db.platformSettings.findUnique({ where: { id: "platform" } });
  return {
    email: s?.supportEmail ?? null,
    phone: s?.supportPhone ?? null,
    whatsapp: s?.supportWhatsapp ?? null,
    hours: s?.supportHours ?? null,
  };
}

type Viewer = { id: string; role: Role; organizationId: string | null };

/** The conversation, if this user may see it: the Platform Admin sees all;
 * a boutique's owner/managers see their own boutique's. Anything else is null. */
export async function findViewableTicket(viewer: Viewer, ticketId: string) {
  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      organization: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true, phone: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!ticket) return null;
  if (viewer.role === "PLATFORM_ADMIN") return ticket;
  if ((viewer.role === "OWNER" || viewer.role === "MANAGER") && ticket.organizationId === viewer.organizationId) {
    return ticket;
  }
  return null;
}

/** Digits only, for wa.me and tel: links. */
export function phoneDigits(value: string): string {
  return value.replace(/[^\d+]/g, "");
}
