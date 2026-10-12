import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MessagesSquare } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getSupportContacts } from "@/lib/support";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactOptions } from "@/components/domain/support/contact-options";
import { NewTicketForm } from "@/components/domain/support/new-ticket-form";

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support", "view") || !session.user.organizationId) redirect("/dashboard");

  const [contacts, organization, tickets] = await Promise.all([
    getSupportContacts(),
    db.organization.findUnique({ where: { id: session.user.organizationId }, select: { name: true } }),
    db.supportTicket.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
      include: {
        createdBy: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromPlatform: true } },
      },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div data-tour="page-header">
        <h1 className="font-heading text-2xl">Help &amp; Support</h1>
        <p className="text-sm text-muted-foreground">Stuck on something? Reach the Bridal Rental OS team directly.</p>
      </div>

      <ContactOptions contacts={contacts} boutiqueName={organization?.name ?? "our boutique"} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2" data-tour="page-content">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Message the support team</CardTitle>
            <p className="text-sm text-muted-foreground">
              We&apos;ll reply here, and you&apos;ll get a notification. The conversation is saved for your team.
            </p>
          </CardHeader>
          <CardContent>
            <NewTicketForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Your conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <MessagesSquare className="size-7" />
                No conversations yet.
              </div>
            ) : (
              tickets.map((t) => {
                const last = t.messages[0];
                return (
                  <Link
                    key={t.id}
                    href={`/dashboard/support/${t.id}`}
                    className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {t.unreadByBoutique && <span className="mr-1.5 inline-block size-2 rounded-full bg-gold align-middle" />}
                        {t.subject}
                      </p>
                      <Badge variant={t.status === "OPEN" ? "secondary" : "outline"} className="shrink-0">
                        {t.status === "OPEN" ? "Open" : "Resolved"}
                      </Badge>
                    </div>
                    {last && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {last.fromPlatform ? "Support: " : ""}
                        {last.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.createdBy.name} · {formatDistanceToNow(t.lastMessageAt, { addSuffix: true })}
                    </p>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
