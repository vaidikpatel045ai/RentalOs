import { signOut } from "@/lib/auth";

// Where lib/session-guard.ts sends a session that's no longer valid (password
// changed or reset, or account deactivated): clear the cookie, then explain on
// the sign-in page. A route handler, because cookies can't be cleared while a
// page is rendering.
export async function GET() {
  await signOut({ redirectTo: "/login?ended=1" });
}
