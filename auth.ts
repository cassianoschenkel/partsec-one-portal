import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "E-mail",
          type: "email",
        },
        password: {
          label: "Senha",
          type: "password",
        },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();

        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user || !user.isActive || !user.passwordHash) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          tenantId: user.tenantId,
          role: user.role as UserRole,
        };
      },
    }),
  ],
  callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = String(user.id);
      token.tenantId = user.tenantId ?? null;
      token.role = user.role;
      token.name = user.name;
      token.email = user.email;
    }

    return token;
  },
  async session({ session, token }) {
  session.user.id = String(token.id);
  session.user.name = String(token.name ?? "");
  session.user.email = String(token.email ?? "");
  session.user.tenantId = token.tenantId ?? null;
  session.user.role = token.role;

  return session;
  },
 },
});
