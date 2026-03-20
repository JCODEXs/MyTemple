import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { CoachService } from "@/server/services/coach.service"

export const coachRouter = createTRPCRouter({

  // ── Coach procedures ────────────────────────────────────────────────────────

  getClientPlans: protectedProcedure
  .input(z.object({ clientId: z.string().cuid() }))
  .query(async ({ ctx, input }) => {
    return CoachService.getClientPlans(ctx.session.user.id, input.clientId)
  }),

  generateInviteCode: protectedProcedure
    .mutation(async ({ ctx }) => {
      return CoachService.generateInviteCode(ctx.session.user.id)
    }),

  getActiveCodes: protectedProcedure
    .query(async ({ ctx }) => {
      return CoachService.getActiveCodes(ctx.session.user.id)
    }),

  getClients: protectedProcedure
    .query(async ({ ctx }) => {
      return CoachService.getClients(ctx.session.user.id)
    }),

  getClientData: protectedProcedure
    .input(z.object({ clientId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return CoachService.getClientData(ctx.session.user.id, input.clientId)
    }),

  unlinkClient: protectedProcedure
    .input(z.object({ clientId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return CoachService.unlinkClient(ctx.session.user.id, input.clientId)
    }),

  // ── User procedures (vinculación) ───────────────────────────────────────────

  redeemCode: protectedProcedure
    .input(z.object({ code: z.string().min(6).max(10) }))
    .mutation(async ({ ctx, input }) => {
      return CoachService.redeemCode(ctx.session.user.id, input.code)
    }),

  unlinkCoach: protectedProcedure
    .mutation(async ({ ctx }) => {
      return CoachService.unlinkCoach(ctx.session.user.id)
    }),
})
