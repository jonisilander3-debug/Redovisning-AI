import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

const authSecret =
  process.env.NEXTAUTH_SECRET ?? "northstar-local-development-secret";

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { company: true },
        });

        if (!user) {
          return null;
        }

        if (user.status === "INACTIVE") {
          return null;
        }

        const passwordMatches = await compare(password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          companySlug: user.company.slug,
          companyName: user.company.name,
        } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companySlug = user.companySlug;
        token.companyName = user.companyName;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? "");
        session.user.role = String(token.role ?? "EMPLOYEE");
        session.user.companyId = String(token.companyId ?? "");
        session.user.companySlug = String(token.companySlug ?? "");
        session.user.companyName = String(token.companyName ?? "");
      }

      return session;
    },
  },
};
