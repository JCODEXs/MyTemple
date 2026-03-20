// import NextAuth from "next-auth";
// import { cache } from "react";

// import { authConfig } from "./config";

// const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

// const auth = cache(uncachedAuth);

// export { auth, handlers, signIn, signOut };

// ─────────────────────────────────────────────────────────────────────────────
// src/server/auth.ts  —  reemplazar el archivo completo
// ─────────────────────────────────────────────────────────────────────────────

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google      from "next-auth/providers/google"
import Discord     from "next-auth/providers/discord"
import Resend      from "next-auth/providers/resend"
import bcrypt      from "bcryptjs"
import { z }       from "zod"
import { db }      from "@/server/db"

// ─── Credentials schema ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
})

// ─── Auth config ──────────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter:  PrismaAdapter(db),
  session:  { strategy: "database" },

  providers: [
    // ── Email + contraseña ────────────────────────────────────────────────────
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",       type: "email"    },
        password: { label: "Contraseña",  type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({
          where:  { email: parsed.data.email },
          select: { id: true, email: true, name: true, image: true, passwordHash: true, role: true },
        })

        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          image: user.image,
        }
      },
    }),

    // ── Google OAuth ──────────────────────────────────────────────────────────
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Discord OAuth ─────────────────────────────────────────────────────────
    Discord({
      clientId:     process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),

    // ── Magic link via Resend ─────────────────────────────────────────────────
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      from:   process.env.RESEND_FROM ?? "noreply@mytemple.app",
      name:   "MyTemple",
    }),
  ],

  pages: {
    signIn:  "/auth/signin",
    error:   "/auth/error",
    newUser: "/setup",
  },

  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id   = user.id
        session.user.role = (user as { role?: string }).role ?? "USER"
      }
      return session
    },

    async signIn({ user, account }) {
      // Bloquear coaches con suscripción vencida
      if (user.id) {
        const dbUser = await db.user.findUnique({
          where:   { id: user.id },
          include: { subscription: true },
        })

        if (
          dbUser?.role === "COACH" &&
          dbUser.subscription?.status === "PAST_DUE"
        ) {
          return "/auth/signin?error=SubscriptionExpired"
        }
      }
      return true
    },
  },
})
