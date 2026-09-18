import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homeRouteForRole } from "@/lib/permissions";

// Neutral post-login landing spot: sends every role to its real home.
// (Middleware also keeps non-admin-shell roles out of /dashboard/* entirely,
// so a Tailor/Cleaner/Delivery/Customer never actually renders this page.)
export default async function DashboardIndexPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  redirect(homeRouteForRole(session.user.role));
}
