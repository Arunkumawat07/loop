import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// NextAuth v5 (Auth.js). Credentials-based auth is enough for the brief's
// scope — swap/add an OAuth provider later if you want it, but every
// session MUST end up carrying { userId, workspaceId, role }, because
// every API route guard and every Prisma query depends on those three
// fields to enforce tenant isolation.

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, `user` is the object returned from authorize() above.
      if (user) {
        token.userId = (user as any).id;
        token.role = (user as any).role;
        token.workspaceId = (user as any).workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      // Every server component / API route reads workspaceId + role from
      // here. Never trust a workspaceId that comes from the client instead.
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).role = token.role;
        (session.user as any).workspaceId = token.workspaceId;
      }
      return session;
    },
  },
});
