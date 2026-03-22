// ─────────────────────────────────────────────────────────────────────────────
// src/server/api/routers/subscription.ts
// ─────────────────────────────────────────────────────────────────────────────

import { z }                                    from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { SubscriptionService }                  from "@/server/services/subscription.service"
import { TRPCError }                            from "@trpc/server"

const planKeySchema = z.enum(["ATHLETE", "COACH"])

export const subscriptionRouter = createTRPCRouter({

  /**
   * Crea la suscripción en PayPal y devuelve el approvalUrl.
   * El frontend redirige al usuario a esa URL.
   */
  createCheckout: protectedProcedure
    .input(z.object({
      plan:      planKeySchema,
      returnUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      return SubscriptionService.createPayPalSubscription(
        ctx.session.user.id,
        input.plan,
        input.returnUrl,
        input.cancelUrl
      )
    }),

  /**
   * Verifica y activa la suscripción después del redirect de PayPal.
   * PayPal añade ?subscription_id=XXX en el returnUrl.
   */
  activate: protectedProcedure
    .input(z.object({
      subscriptionId: z.string(),
      plan:           planKeySchema,
    }))
    .mutation(async ({ ctx, input }) => {
      return SubscriptionService.activateSubscription(
        ctx.session.user.id,
        input.subscriptionId,
        input.plan
      )
    }),

  /**
   * Estado actual de la suscripción — para mostrar en perfil.
   */
  getStatus: protectedProcedure
    .query(async ({ ctx }) => {
      return SubscriptionService.getStatus(ctx.session.user.id)
    }),

  /**
   * El coach cancela su suscripción.
   */
  cancel: protectedProcedure
    .mutation(async ({ ctx }) => {
      const status = await SubscriptionService.getStatus(ctx.session.user.id)
      if (!status) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sin suscripción activa." })
      }
      return SubscriptionService.cancelSubscription(ctx.session.user.id)
    }),

  /**
   * Metadata de los planes — para mostrar en la página de precios.
   */
  getPlans: protectedProcedure
    .query(() => ({
      ATHLETE: SubscriptionService.getPlanMeta("ATHLETE"),
      COACH:   SubscriptionService.getPlanMeta("COACH"),
    })),
})


// ─────────────────────────────────────────────────────────────────────────────
// AÑADIR en src/server/api/root.ts
// ─────────────────────────────────────────────────────────────────────────────

/*
import { subscriptionRouter } from "@/server/api/routers/subscription"

export const appRouter = createTRPCRouter({
  auth:            authRouter,
  userProfile:     userProfileRouter,
  ingredient:      ingredientRouter,
  dailyLog:        dailyLogRouter,
  workout:         workoutRouter,
  recipe:          recipeRouter,
  coach:           coachRouter,
  nutritionPlan:   nutritionPlanRouter,
  admin:           adminRouter,
  communications:  communicationsRouter,
  subscription:    subscriptionRouter,  // ← añadir
})
*/


// ─────────────────────────────────────────────────────────────────────────────
// ACTUALIZAR src/server/auth.ts — bloquear PAST_DUE en signIn callback
// ─────────────────────────────────────────────────────────────────────────────

/*
callbacks: {
  session: ({ session, user }) => ({
    ...session,
    user: {
      ...session.user,
      id:   user.id,
      role: (user as { role?: string }).role ?? "USER",
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
*/
