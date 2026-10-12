import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { findViewableTicket } from "@/lib/support";
import { Badge } from "@/components/ui/badge";
import { SupportThread } from "@/components/domain/support/support-thread";
import { TicketStatusButton } from "@/components/domain/support/ticket-status-button";
import { sendSupportMessage } from "@/lib/actions/support-actions";

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support", "view")) redirect("/dashboard");
  const ticket = await findViewableTicket(session.user, id);
  if (!ticket) notFound();
  if (ticket.unreadByBoutique) {
    await db.supportTicket.update({ where: { id }, data: { unreadByBoutique: false } });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/dashboard/support" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Help &amp; Support
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">
            Started by {ticket.createdBy.name} ·{" "}
            <Badge variant={ticket.status === "OPEN" ? "secondary" : "outline"}>{ticket.status === "OPEN" ? "Open" : "Resolved"}</Badge>
          </p>
        </div>
        <TicketStatusButton ticketId={ticket.id} status={ticket.status} />
      </div>
      <SupportThread
        side="boutique"
        action={sendSupportMessage.bind(null, ticket.id)}
        placeholder="Write a reply…"
        messages={ticket.messages.map((m) => ({
          id: m.id,
          body: m.body,
          fromPlatform: m.fromPlatform,
          authorName: m.fromPlatform ? "Bridal Rental OS Support" : m.author.name,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
