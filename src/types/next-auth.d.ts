import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    companyId: string;
    companySlug: string;
    companyName: string;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      companyId: string;
      companySlug: string;
      companyName: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    companyId?: string;
    companySlug?: string;
    companyName?: string;
  }
}
