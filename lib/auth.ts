import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { homeRouteForRole } from "@/lib/permissions";
import { authConfig } from "@/lib/auth.config";
import type { Role } from "@prisma/client";

// Full server-side config (Node.js runtime only — imports Prisma). Credentials
// + JWT sessions, since Auth.js doesn't support mixing Credentials with a
// database session strategy. The JWT carries role/branchId/id so every
// server component/action can authorize without an extra DB round-trip.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
        };
      },
    }),
  ],
});

export function redirectPathForRole(role: Role): string {
  return homeRouteForRole(role);
}
