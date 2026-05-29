import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

type AppRole = "user" | "admin";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_API_KEY ?? "admin";
        const userPassword = process.env.USER_PASSWORD ?? "user";

        let role: AppRole | null = null;
        if (email === adminEmail && password === adminPassword) role = "admin";
        else if (password === userPassword) role = "user";
        if (!role) return null;

        return { id: email, email, name: role === "admin" ? "Policy Admin" : "Policy User", role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: AppRole }).role ?? "user";
      return token;
    },
    session({ session, token }) {
      if (session.user)
        (session.user as { role?: AppRole }).role = (token.role as AppRole) ?? "user";
      return session;
    },
  },
  pages: { signIn: "/login" },
};
