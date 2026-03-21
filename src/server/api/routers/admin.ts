
// ─────────────────────────────────────────────────────────────────────────────
// src/server/api/routers/admin.ts
// ─────────────────────────────────────────────────────────────────────────────

import { z }                                          from "zod"
import { createTRPCRouter, adminProcedure }            from "@/server/api/trpc"
import { AdminService }                               from "@/server/services/admin.service"
import { UserRole }                                   from "../../../../generated/prisma"

export const adminRouter = createTRPCRouter({

  getStats: adminProcedure
    .query(({ ctx }) => AdminService.getStats(ctx.session.user.id)),

  getUsers: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      role:   z.nativeEnum(UserRole).optional(),
      page:   z.number().int().min(1).default(1),
      limit:  z.number().int().min(1).max(50).default(20),
    }))
    .query(({ ctx, input }) => AdminService.getUsers(ctx.session.user.id, input)),

  changeRole: adminProcedure
    .input(z.object({
      targetUserId: z.string().cuid(),
      newRole:      z.nativeEnum(UserRole),
    }))
    .mutation(({ ctx, input }) =>
      AdminService.changeRole(ctx.session.user.id, input.targetUserId, input.newRole)
    ),

  generateCoachCode: adminProcedure
    .input(z.object({ expiresInDays: z.number().int().min(1).max(365).default(30) }))
    .mutation(({ ctx, input }) =>
      AdminService.generateCoachCode(ctx.session.user.id, input.expiresInDays)
    ),

  getCodes: adminProcedure
    .query(({ ctx }) => AdminService.getCodes(ctx.session.user.id)),

  getSubscriptions: adminProcedure
    .query(({ ctx }) => AdminService.getSubscriptions(ctx.session.user.id)),

  updateSubscription: adminProcedure
    .input(z.object({
      subscriptionId:    z.string().cuid(),
      status:            z.enum(["ACTIVE", "CANCELLED", "PAST_DUE", "TRIAL"]).optional(),
      clientCodeCredits: z.number().int().min(0).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { subscriptionId, ...data } = input
      return AdminService.updateSubscription(ctx.session.user.id, subscriptionId, data)
    }),
})
