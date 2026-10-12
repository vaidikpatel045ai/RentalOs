import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Building2, Tag, KeyRound, LifeBuoy, Settings } from "lucide-react";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { enforceSessionValidity } from "@/lib/session-guard";
import { db } from "@/lib/db";

// Separate shell from the tenant dashboard on purpose — a Platform Admin is
// selling the software, not running a boutique, so this never shares
// getNavItemsForRole or the tenant RBAC map (lib/permissions.ts). Every
// /admin page/action checks role === "PLATFORM_ADMIN" directly instead.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/login");
  await enforceSessionValidity(session);
  const unreadSupport = await db.supportTicket.count({ where: { unreadByPlatform: true } });

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <span className="font-heading text-lg tracking-tight">Platform Admin</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          <Link href="/admin" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <Building2 className="size-4 shrink-0" /> Organizations
          </Link>
          <Link href="/admin/plans" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <Tag className="size-4 shrink-0" /> Plans
          </Link>
          <Link href="/admin/support" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LifeBuoy className="size-4 shrink-0" /> Support
            {unreadSupport > 0 && (
              <span className="ml-auto rounded-full bg-gold px-1.5 text-xs font-semibold text-gold-foreground">{unreadSupport}</span>
            )}
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <Settings className="size-4 shrink-0" /> Settings
          </Link>
        </nav>
      </aside>
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <span className="font-heading text-lg tracking-tight md:hidden">Platform Admin</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{session.user.email}</span>
            <Button asChild variant="ghost" size="sm">
              <Link href="/change-password">
                <KeyRound className="size-4" /> Change password
              </Link>
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" /> Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 bg-background p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
