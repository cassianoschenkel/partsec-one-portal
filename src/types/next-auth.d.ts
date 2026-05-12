import type { UserRole } from "@/generated/prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      tenantId: string | null;
      role: UserRole;
    };
  }

  interface User {
    tenantId: string | null;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tenantId: string | null;
    role: UserRole;
  }
}
