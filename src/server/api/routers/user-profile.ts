import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { UserProfileService } from "@/server/services/user-profile.service"
import { Sex, GoalType } from "@prisma/client"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileBaseSchema = z.object({
  age: z.number().int().min(10).max(120),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(20).max(400),
  bodyFatPct: z.number().min(3).max(70).optional(),
  sex: z.nativeEnum(Sex),
  goal: z.nativeEnum(GoalType),
  activityFactor: z.number().min(1.0).max(2.5).optional(),
})

// ─── Router ───────────────────────────────────────────────────────────────────

export const userProfileRouter = createTRPCRouter({

  get: protectedProcedure.query(async ({ ctx }) => {
    return UserProfileService.get(ctx.session.user.id)
  }),

  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const summary = await UserProfileService.getSummary(ctx.session.user.id)
    if (!summary) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Completa tu perfil para comenzar.",
      })
    }
    return summary
  }),

  create: protectedProcedure
    .input(profileBaseSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await UserProfileService.create(ctx.session.user.id, input)
      } catch (e) {
        throw new TRPCError({
          code: "CONFLICT",
          message: (e as Error).message,
        })
      }
    }),

  update: protectedProcedure
    .input(profileBaseSchema.partial())
    .mutation(async ({ ctx, input }) => {
      try {
        return await UserProfileService.update(ctx.session.user.id, input)
      } catch (e) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: (e as Error).message,
        })
      }
    }),
})
