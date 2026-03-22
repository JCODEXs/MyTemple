// // ─────────────────────────────────────────────────────────────────────────────
// // src/server/api/routers/subscription.ts
// // ─────────────────────────────────────────────────────────────────────────────

// import { z }                                    from "zod"
// import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
// import { SubscriptionService }                  from "@/server/services/subscription.service"
// import { TRPCError }                            from "@trpc/server"

// const planKeySchema = z.enum(["ATHLETE", "COACH"])

// export const subscriptionRouter = createTRPCRouter({

//   /**
//    * Crea la suscripción en PayPal y devuelve el approvalUrl.
//    * El frontend redirige al usuario a esa URL.
//    */
//   createCheckout: protectedProcedure
//     .input(z.object({
//       plan:      planKeySchema,
//       returnUrl: z.string().url(),
//       cancelUrl: z.string().url(),
//     }))
//     .mutation(async ({ ctx, input }) => {
//       return SubscriptionService.createPayPalSubscription(
//         ctx.session.user.id,
//         input.plan,
//         input.returnUrl,
//         input.cancelUrl
//       )
//     }),

//   /**
//    * Verifica y activa la suscripción después del redirect de PayPal.
//    * PayPal añade ?subscription_id=XXX en el returnUrl.
//    */
//   activate: protectedProcedure
//     .input(z.object({
//       subscriptionId: z.string(),
//       plan:           planKeySchema,
//     }))
//     .mutation(async ({ ctx, input }) => {
//       return SubscriptionService.activateSubscription(
//         ctx.session.user.id,
//         input.subscriptionId,
//         input.plan
//       )
//     }),

//   /**
//    * Estado actual de la suscripción — para mostrar en perfil.
//    */
//   getStatus: protectedProcedure
//     .query(async ({ ctx }) => {
//       return SubscriptionService.getStatus(ctx.session.user.id)
//     }),

//   /**
//    * El coach cancela su suscripción.
//    */
//   cancel: protectedProcedure
//     .mutation(async ({ ctx }) => {
//       const status = await SubscriptionService.getStatus(ctx.session.user.id)
//       if (!status) {
//         throw new TRPCError({ code: "NOT_FOUND", message: "Sin suscripción activa." })
//       }
//       return SubscriptionService.cancelSubscription(ctx.session.user.id)
//     }),

//   /**
//    * Metadata de los planes — para mostrar en la página de precios.
//    */
//   getPlans: protectedProcedure
//     .query(() => ({
//       ATHLETE: SubscriptionService.getPlanMeta("ATHLETE"),
//       COACH:   SubscriptionService.getPlanMeta("COACH"),
//     })),
// })





import { z }                                    from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { MPSubscriptionService, PLAN_META }     from "@/server/services/mp-subscription.service"
import { TRPCError }                            from "@trpc/server"

const planKeySchema = z.enum(["ATHLETE", "COACH"])

export const subscriptionRouter = createTRPCRouter({

  // Metadata de planes para mostrar en UI
  getPlans: protectedProcedure
    .query(() => PLAN_META),

  // Estado de suscripción del usuario
  getStatus: protectedProcedure
    .query(({ ctx }) => MPSubscriptionService.getStatus(ctx.session.user.id)),

  // Opción 1: Suscripción recurrente MP (redirige a checkout MP)
  createSubscriptionCheckout: protectedProcedure
    .input(z.object({
      plan:      planKeySchema,
      returnUrl: z.string().url(),
    }))
    .mutation(({ ctx, input }) =>
      MPSubscriptionService.createSubscriptionCheckout(
        ctx.session.user.id,
        input.plan,
        input.returnUrl
      )
    ),

  // Opción 2: QR dinámico (genera QR para escanear)
  createQRPayment: protectedProcedure
    .input(z.object({ plan: planKeySchema }))
    .mutation(({ ctx, input }) =>
      MPSubscriptionService.createQRPayment(ctx.session.user.id, input.plan)
    ),

  // Opción 3: Link de pago simple (Checkout Pro, sin necesidad de store)
  createPaymentLink: protectedProcedure
    .input(z.object({ plan: planKeySchema }))
    .mutation(({ ctx, input }) =>
      MPSubscriptionService.createPaymentLink(ctx.session.user.id, input.plan)
    ),

  // Verificar pago manualmente (para el caso pending)
  verifyPayment: protectedProcedure
    .input(z.object({ reference: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pending = await db.pendingPayment.findUnique({
        where: { reference: input.reference },
      })
      if (!pending || pending.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado." })
      }
      if (pending.activated) {
        return { activated: true }
      }
      return { activated: false, status: "pending" }
    }),

  // Cancelar suscripción
  cancel: protectedProcedure
    .mutation(async ({ ctx }) => {
      const status = await MPSubscriptionService.getStatus(ctx.session.user.id)
      if (!status) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sin suscripción activa." })
      }
      return MPSubscriptionService.cancelSubscription(ctx.session.user.id)
    }),
})