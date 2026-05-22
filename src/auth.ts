import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password);

          if (passwordsMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        (session.user as any).role = (token.role as string) || "user";
        session.user.name = token.name;
        session.user.image = token.picture as string | null;
        session.user.email = token.email as string;
      }
      return session;
    },
    async jwt({ token }) {
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, name: true, image: true, email: true }
        });
        if (dbUser) {
          token.role = dbUser.role || "user";
          token.name = dbUser.name;
          token.picture = dbUser.image;
          token.email = dbUser.email;
        }
      }
      return token;
    },
  },
});