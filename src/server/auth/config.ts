import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import { db } from "@/server/db";

// NOTE: Module augmentation for next-auth types is centralized in
// src/types/next-auth.d.ts — do NOT add a duplicate declare module here.

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    DiscordProvider,
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  //     async jwt({ token, trigger }) {
  //   // Recargar hasProfile en cada sign in o cuando se actualiza la sesión
  //   if (trigger === "signIn" || trigger === "update") {
  //     const profile = await db.userProfile.findUnique({
  //       where: { userId: token.sub! },
  //       select: { id: true },
  //     })
  //     token.hasProfile = !!profile
  //   }
  //   return token
  // },

  // async session({ session, token }) {
  //   if (session.user) {
  //     session.user.id        = token.sub!
  //     session.user.hasProfile = token.hasProfile as boolean ?? false
  //   }
  //   return session
  // },
  },
} satisfies NextAuthConfig;






