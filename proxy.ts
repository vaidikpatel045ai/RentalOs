import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { ADMIN_SHELL_ROLES, homeRouteForRole } from "@/lib/permissions";

// Edge-safe auth check (see lib/auth.config.ts for why this is split out
// from lib/auth.ts). Route-level gating only — resource-level permission
// checks (`can()` from lib/permissions.ts) still run server-side on every
// action/query, since this alone is never sufficient authorization.
//
// Next.js 16 renamed the `middleware` file convention to `proxy` — this file
// was migrated from middleware.ts accordingly (see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
const { auth } = NextAuth(authConfig);

const PORTAL_PREFIX_BY_ROLE: Record<string, string> = {
  TAILOR: "/portal/tailor",
  CLEANER: "/portal/cleaner",
  DELIVERY: "/portal/delivery",
  CUSTOMER: "/portal/customer",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = Boolean(req.auth?.user);
  const role = req.auth?.user?.role;

  const isLoginPage = pathname === "/login";
  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/portal");

  if (isLoginPage) {
    if (isAuthed && role) {
      return NextResponse.redirect(new URL(homeRouteForRole(role), req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!isAuthed || !role) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/dashboard") && !ADMIN_SHELL_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(homeRouteForRole(role), req.nextUrl));
  }

  if (pathname.startsWith("/portal")) {
    const allowedPrefix = PORTAL_PREFIX_BY_ROLE[role];
    if (!allowedPrefix || !pathname.startsWith(allowedPrefix)) {
      return NextResponse.redirect(new URL(homeRouteForRole(role), req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*", "/login"],
};
