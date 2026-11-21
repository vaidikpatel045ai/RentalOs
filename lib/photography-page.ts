import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can, type Action } from "@/lib/permissions";
import { isPhotographyEnabled } from "@/lib/photography";

/**
 * For photography pages: the signed-in user, or a 404 when the boutique
 * doesn't have the module switched on or the role may not `action` it.
 * A 404 rather than an error, so a boutique without the module never even
 * learns the pages exist.
 */
export async function requirePhotographyPage(action: Action = "view") {
  const session = await auth();
  if (!session?.user) notFound();
  if (!can(session.user.role, "photography", action)) notFound();
  if (!(await isPhotographyEnabled(session.user.organizationId))) notFound();
  return session.user;
}
