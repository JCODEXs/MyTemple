import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { NutritionPlanService } from "@/server/services/nutrition-plan.service"
import { MealType } from "../../../../generated/prisma"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const mealRecipeSchema = z.object({
  recipeId: z.string().cuid(),
  servings: z.number().positive(),
})

const mealSchema = z.object({
  mealType: z.nativeEnum(MealType),
  recipes:  z.array(mealRecipeSchema),
})

const daySchema = z.object({
  date:  z.coerce.date(),
  meals: z.array(mealSchema),
})

const createPlanSchema = z.object({
  name:        z.string().min(1).max(100),
  startDate:   z.coerce.date(),
  endDate:     z.coerce.date(),
  targetKcal:  z.number().positive().optional(),
  proteinPct:  z.number().min(0.1).max(0.6),
  carbsPct:    z.number().min(0.1).max(0.7),
  fatPct:      z.number().min(0.1).max(0.5),
  days:        z.array(daySchema),
})

// ─── Router ───────────────────────────────────────────────────────────────────

export const nutritionPlanRouter = createTRPCRouter({

  /**
   * Genera sugerencia sin persistir — el usuario la revisa primero.
   */
  generateSuggestion: protectedProcedure
    .input(z.object({
      startDate:    z.coerce.date(),
      durationDays: z.number().int().min(1).max(30).default(7),
      targetKcal:   z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return NutritionPlanService.generateSuggestion(ctx.session.user.id, input)
    }),

  /**
   * Persiste el plan después de que el usuario lo aprueba/ajusta.
   */
  create: protectedProcedure
    .input(createPlanSchema)
    .mutation(async ({ ctx, input }) => {
      return NutritionPlanService.createFromSuggestion(ctx.session.user.id, input)
    }),

  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      return NutritionPlanService.getAll(ctx.session.user.id)
    }),

  getOne: protectedProcedure
    .input(z.object({ planId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return NutritionPlanService.getOne(ctx.session.user.id, input.planId)
    }),

  /**
   * Plan del día — usado por DailyLogForm para pre-cargar el estado.
   */
  getPlanForDate: protectedProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      return NutritionPlanService.getPlanForDate(ctx.session.user.id, input.date)
    }),

  delete: protectedProcedure
    .input(z.object({ planId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await NutritionPlanService.delete(ctx.session.user.id, input.planId)
      return { success: true }
    }),
})
