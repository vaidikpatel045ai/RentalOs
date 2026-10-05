import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      branchId: string | null;
      organizationId: string | null;
      /** ms since epoch; 0 for sessions issued before this was tracked. */
      signedInAt: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    branchId: string | null;
    organizationId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    branchId: string | null;
    organizationId: string | null;
    signedInAt?: number;
  }
}
