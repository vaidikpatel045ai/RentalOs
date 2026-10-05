import { redirect } from "next/navigation";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/domain/notification-bell";
import { PageTour } from "@/components/tour/page-tour";
import { getUnreadNotificationCount, getRecentNotifications } from "@/lib/queries/notifications";
import { getOrganizationForUser, isOrganizationActive } from "@/lib/tenant";
import { enforceSessionValidity } from "@/lib/session-guard";

// Shared shell for the mobile-first operational portals (Tailor, Cleaner,
// Delivery, Customer). Deliberately minimal — no admin sidebar — per spec
// section 41 ("Do NOT overwhelm the tailor or cleaner with admin
// functionality"). This gives every role a real, branded landing spot
// after login instead of a dead end.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [, organization, unreadCount, notifications] = await Promise.all([
    enforceSessionValidity(session),
    getOrganizationForUser(session.user.organizationId),
    getUnreadNotificationCount(session.user.id),
    getRecentNotifications(session.user.id),
  ]);
  if (!isOrganizationActive(organization)) {
    redirect("/suspended");
  }

  const name = session.user.name ?? session.user.email ?? "User";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <span className="font-heading text-lg tracking-tight">Bridal Rental OS</span>
        <div className="flex items-center gap-3">
          <PageTour />
          <NotificationBell unreadCount={unreadCount} notifications={notifications} />
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar className="size-7">
              <AvatarFallback className="bg-gold/15 text-xs text-gold">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{name}</span>
          </div>
          <Button asChild variant="ghost" size="icon" aria-label="Change password" title="Change password">
            <Link href="/change-password">
              <KeyRound className="size-4" />
            </Link>
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="icon" className="sm:hidden" aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
            <Button type="submit" variant="ghost" size="sm" className="hidden sm:inline-flex">
              <LogOut className="size-4" /> Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
}
