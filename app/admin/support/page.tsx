import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Inbox } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") redirect("/login");
  const { status } = await searchParams;
  const showResolved = status === "resolved";

  const [tickets, openCount, resolvedCount] = await Promise.all([
    db.supportTicket.findMany({
      where: { status: showResolved ? "RESOLVED" : "OPEN" },
      orderBy: [{ unreadByPlatform: "desc" }, { lastMessageAt: "desc" }],
      include: {
        organization: { select: { name: true } },
        createdBy: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromPlatform: true } },
      },
      take: 100,
    }),
    db.supportTicket.count({ where: { status: "OPEN" } }),
    db.supportTicket.count({ where: { status: "RESOLVED" } }),
  ]);

  const tab = (active: boolean) =>
    cn("rounded-md px-3 py-1.5 text-sm", active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Support inbox</h1>
        <p className="text-sm text-muted-foreground">Messages from boutiques. Unread conversations are at the top.</p>
      </div>
      <div className="flex gap-2">
        <Link href="/admin/support" className={tab(!showResolved)}>
          Open ({openCount})
        </Link>
        <Link href="/admin/support?status=resolved" className={tab(showResolved)}>
          Resolved ({resolvedCount})
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          <Inbox className="size-7" />
          {showResolved ? "No resolved conversations yet." : "No open conversations. All caught up."}
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {tickets.map((t) => {
            const last = t.messages[0];
            return (
              <Link key={t.id} href={`/admin/support/${t.id}`} className="block p-4 transition-colors hover:bg-accent">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className={cn("min-w-0 text-sm", t.unreadByPlatform ? "font-semibold" : "font-medium")}>
                    {t.unreadByPlatform && <span className="mr-1.5 inline-block size-2 rounded-full bg-gold align-middle" />}
                    {t.organization.name}: {t.subject}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(t.lastMessageAt, { addSuffix: true })}
                  </span>
                </div>
                {last && (
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {last.fromPlatform ? "You: " : `${t.createdBy.name}: `}
                    {last.body}
                  </p>
                )}
                {t.unreadByPlatform && <Badge className="mt-2">Needs reply</Badge>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
