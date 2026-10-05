import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe subset of the Auth.js config (no Prisma import — the
 * Credentials provider's `authorize()` touches the database and must stay
 * out of this file). Middleware runs on the Edge runtime, which can't load
 * Prisma's native client, so it uses this trimmed config; `lib/auth.ts`
 * extends it with the real provider for use in Node.js route handlers and
 * server components.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.branchId = (user as { branchId: string | null }).branchId;
        token.organizationId = (user as { organizationId: string | null }).organizationId;
        token.id = user.id as string;
        // When this sign-in happened: a password change after it ends the session (lib/session-guard.ts).
        token.signedInAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.branchId = token.branchId as string | null;
        session.user.organizationId = token.organizationId as string | null;
        session.user.signedInAt = (token.signedInAt as number | undefined) ?? 0;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
