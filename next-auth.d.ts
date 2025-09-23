import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: string | null;
  }
  interface Session {
    user?: ({
      id?: string;
      role?: string | null;
    } & DefaultSession["user"]) | null;
  }
}