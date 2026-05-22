import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");

      const isAuthRoute =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register") ||
        nextUrl.pathname.startsWith("/reset") ||
        nextUrl.pathname.startsWith("/new-password") ||
        nextUrl.pathname.startsWith("/new-verification");

      const isProtectedRoute =
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/workspace") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/dashboard");

      if (isAdminRoute) {
        if (!isLoggedIn) return false;
        const hasAdminRole = (auth?.user as any)?.role === "admin";
        if (hasAdminRole) return true;
        return Response.redirect(new URL("/", nextUrl));
      }

      if (isAuthRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl)); // ✅ redirect ke dashboard (/)
        }
        return true;
      }

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false;
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;