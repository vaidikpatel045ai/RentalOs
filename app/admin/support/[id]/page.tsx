import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findViewableTicket, phoneDigits } from "@/lib/support";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupportThread } from "@/components/domain/support/support-thread";
import { TicketStatusButton } from "@/components/domain/support/ticket-status-button";
import { sendSupportMessage } from "@/lib/actions/support-actions";

export default async function AdminSupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") redirect("/login");
  const ticket = await findViewableTicket(session.user, id);
  if (!ticket) notFound();
  if (ticket.unreadByPlatform) {
    await db.supportTicket.update({ where: { id }, data: { unreadByPlatform: false } });
  }
  const { createdBy } = ticket;
  const firstName = createdBy.name.split(" ")[0];

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/support" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Support inbox
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">
            <Link href={`/admin/organizations/${ticket.organization.id}`} className="hover:underline">
              {ticket.organization.name}
            </Link>{" "}
            · {createdBy.name}
          </p>
          <h1 className="font-heading text-2xl">{ticket.subject}</h1>
          <Badge variant={ticket.status === "OPEN" ? "secondary" : "outline"}>{ticket.status === "OPEN" ? "Open" : "Resolved"}</Badge>
        </div>
        <TicketStatusButton ticketId={ticket.id} status={ticket.status} />
      </div>

      {/* Reach the person directly when chat isn't enough. */}
      <div className="flex flex-wrap gap-2">
        {createdBy.phone && (
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`https://wa.me/${phoneDigits(createdBy.phone).replace("+", "")}`} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> WhatsApp {firstName}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`tel:${phoneDigits(createdBy.phone)}`}>
                <Phone className="size-4" /> Call {createdBy.phone}
              </a>
            </Button>
          </>
        )}
        <Button asChild variant="outline" size="sm">
          <a href={`mailto:${createdBy.email}?subject=${encodeURIComponent(`Re: ${ticket.subject}`)}`}>
            <Mail className="size-4" /> {createdBy.email}
          </a>
        </Button>
      </div>

      <SupportThread
        side="platform"
        action={sendSupportMessage.bind(null, ticket.id)}
        placeholder={`Reply to ${firstName}…`}
        messages={ticket.messages.map((m) => ({
          id: m.id,
          body: m.body,
          fromPlatform: m.fromPlatform,
          authorName: m.fromPlatform ? "You" : m.author.name,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
