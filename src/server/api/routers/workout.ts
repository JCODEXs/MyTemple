import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { WorkoutService } from "@/server/services/workout.service"
import { WorkoutType } from "@prisma/client"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createWorkoutSchema = z.object({
  date: z.coerce.date(),
  type: z.nativeEnum(WorkoutType),
  durationMinutes: z.number().positive().max(600),
  intensityFactor: z.number().min(1).max(20),
  realKcal: z.number().positive().optional(),
})

const updateWorkoutSchema = z.object({
  workoutId: z.string().cuid(),
  type: z.nativeEnum(WorkoutType).optional(),
  durationMinutes: z.number().positive().max(600).optional(),
  intensityFactor: z.number().min(1).max(20).optional(),
  realKcal: z.number().positive().nullable().optional(),
})

const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
})

// ─── Router ───────────────────────────────────────────────────────────────────

export const workoutRouter = createTRPCRouter({

  create: protectedProcedure
    .input(createWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await WorkoutService.create(ctx.session.user.id, input)
      } catch (e) {
        throw new TRPCError({ code: "BAD_REQUEST", message: (e as Error).message })
      }
    }),

  update: protectedProcedure
    .input(updateWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const { workoutId, ...data } = input
      try {
        return await WorkoutService.update(ctx.session.user.id, workoutId, data)
      } catch (e) {
        throw new TRPCError({ code: "NOT_FOUND", message: (e as Error).message })
      }
    }),

  delete: protectedProcedure
    .input(z.object({ workoutId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await WorkoutService.delete(ctx.session.user.id, input.workoutId)
        return { success: true }
      } catch (e) {
        throw new TRPCError({ code: "NOT_FOUND", message: (e as Error).message })
      }
    }),

  getOne: protectedProcedure
    .input(z.object({ workoutId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const workout = await WorkoutService.getOne(ctx.session.user.id, input.workoutId)
      if (!workout) throw new TRPCError({ code: "NOT_FOUND", message: "Entrenamiento no encontrado." })
      return workout
    }),

  getRange: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      return WorkoutService.getRange(ctx.session.user.id, input.from, input.to)
    }),

  getSummary: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      return WorkoutService.getSummary(ctx.session.user.id, input.from, input.to)
    }),
})
