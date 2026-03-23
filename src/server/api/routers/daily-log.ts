import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { DailyEnergyService } from "../../services/daily-energy.service"
import { WorkoutType } from "../../../../generated/prisma"
import { UserProfileService } from "./user-profile.service"
// ─── Schemas ──────────────────────────────────────────────────────────────────

const workoutInputSchema = z.object({
  type: z.nativeEnum(WorkoutType),
  durationMinutes: z.number().positive(),
  intensityFactor: z.number().min(1).max(20),
  realKcal: z.number().positive().optional(),
})

const logDaySchema = z.object({
  date: z.coerce.date(),
  caloriesIn: z.number().positive(),
  proteinGrams: z.number().min(0),
  carbsGrams: z.number().min(0),
  fatGrams: z.number().min(0),
  workout: workoutInputSchema.optional(),
})

const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
})

// ─── Router ───────────────────────────────────────────────────────────────────

export const dailyLogRouter = createTRPCRouter({
  /**
   * Registra el día completo: intake + workout opcional.
   * Devuelve el balance energético calculado al instante.
   */
  logDay: protectedProcedure
    .input(logDaySchema)
    .mutation(async ({ ctx, input }) => {
      return DailyEnergyService.logDay(ctx.session.user.id, input)
    }),

  /**
   * Obtiene el log de un día específico.
   */
  getDay: protectedProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      return DailyEnergyService.getDay(ctx.session.user.id, input.date)
    }),

  /**
   * Rango de fechas — para gráficas de progreso.
   */
  getRange: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      return DailyEnergyService.getRange(ctx.session.user.id, input.from, input.to)
    }),

  /**
   * Resumen semanal — para el dashboard principal.
   */
  getWeeklySummary: protectedProcedure
    .input(z.object({ weekStart: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      return DailyEnergyService.getWeeklySummary(ctx.session.user.id, input.weekStart)
    }),

  /**
   * Registra el peso real del día y dispara la adaptación metabólica.
   * Este es el punto de entrada del loop adaptativo.
   */
  logWeight: protectedProcedure
    .input(z.object({
      date: z.coerce.date(),
      weightKg: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      return DailyEnergyService.applyMetabolicAdaptation(
        ctx.session.user.id,
        input.weightKg,
        input.date
      )
    }),
     // Exponer el bmr calculado junto con el DailyLog
  // El dashboard necesita el bmr del día para separar TMB vs training

  getDayWithBMR: protectedProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const [log, profile] = await Promise.all([
        DailyEnergyService.getDay(ctx.session.user.id, input.date),
        UserProfileService.get(ctx.session.user.id),
      ])

      if (!log || !profile) return null

      const bmr = (10 * profile.weightKg + 6.25 * profile.heightCm
        - 5 * profile.age + (profile.sex === "MALE" ? 5 : -161))
        * profile.metabolicAdjustment

      return { ...log, bmr }
    }),
})
