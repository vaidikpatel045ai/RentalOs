import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCachedBranchById } from "@/lib/queries/branches";
import { getUnreadNotificationCount, getRecentNotifications } from "@/lib/queries/notifications";
import { getOrganizationForUser, isOrganizationActive } from "@/lib/tenant";
import { enforceSessionValidity } from "@/lib/session-guard";
import { AppSidebar } from "@/components/domain/app-sidebar";
import { AppTopbar } from "@/components/domain/app-topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Runs on every dashboard navigation — all in parallel, one DB round trip total.
  const [, organization, branch, unreadCount, notifications] = await Promise.all([
    enforceSessionValidity(session),
    getOrganizationForUser(session.user.organizationId),
    session.user.branchId ? getCachedBranchById(session.user.branchId) : Promise.resolve(null),
    getUnreadNotificationCount(session.user.id),
    getRecentNotifications(session.user.id),
  ]);
  if (!isOrganizationActive(organization)) {
    redirect("/suspended");
  }

  return (
    <div className="flex min-h-svh">
      <AppSidebar role={session.user.role} />
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <AppTopbar
          name={session.user.name ?? session.user.email ?? "User"}
          email={session.user.email ?? ""}
          role={session.user.role}
          branchName={session.user.role === "OWNER" ? "All Branches" : branch?.name}
          unreadCount={unreadCount}
          notifications={notifications}
        />
        <main className="flex-1 bg-background p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
