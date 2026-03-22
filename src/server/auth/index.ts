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
// NOTE: Credentials provider in Auth.js v5 always produces a JWE (JWT) session
// cookie regardless of the strategy setting. Using strategy:"jwt" so auth()
// decodes it directly from the cookie — no DB session-table lookup needed.
// The PrismaAdapter is still used for OAuth User/Account records.

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter:  PrismaAdapter(db),
  session:  { strategy: "jwt" },

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
          role:  user.role,   // pass role so jwt callback can store it in the token
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
  // Runs on every sign-in and on every session refresh.
  // We persist id + role into the JWT so auth() can expose them without a DB hit.
  jwt: async ({ token, user }) => {
    if (user?.id) {
      token.id = user.id
      // user.role is set by the credentials authorize callback.
      // For OAuth sign-ins, fetch it from DB once (on first login).
      token.role = (user as { role?: string }).role
        ?? (await db.user.findUnique({
              where:  { id: user.id },
              select: { role: true },
            }).then((u) => u?.role ?? "USER"))
    }
    return token
  },

  // Expose id + role on session.user so server components can read them.
  session: ({ session, token }) => ({
    ...session,
    user: {
      ...session.user,
      id:   token.id   as string,
      role: token.role as string ?? "USER",
    },
  }),

  async signIn({ user }) {
    if (!user.id) return true

    try {
      const dbUser = await db.user.findUnique({
        where:  { id: user.id },
        select: {
          role: true,
          subscription: { select: { status: true, currentPeriodEnd: true } },
        },
      })

      if (dbUser?.role === "COACH" || dbUser?.role === "USER") {
        const sub = dbUser.subscription

        // Bloquear si PAST_DUE
        if (sub?.status === "PAST_DUE") {
          return "/auth/signin?error=SubscriptionExpired"
        }

        // Bloquear si TRIAL expirado (currentPeriodEnd pasó y no hay pago)
        if (
          sub?.status === "TRIAL" &&
          sub.currentPeriodEnd &&
          sub.currentPeriodEnd < new Date()
        ) {
          return "/auth/signin?error=TrialExpired"
        }
      }
    } catch { /* permitir login si falla el check */ }

    return true
  },
},
})
