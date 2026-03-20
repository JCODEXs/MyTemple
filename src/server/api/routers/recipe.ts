// ─────────────────────────────────────────────────────────────────────────────
// src/server/api/routers/recipe.ts  —  tRPC router
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { RecipeService } from "@/server/services/recipe.service"


// ─── Schemas ──────────────────────────────────────────────────────────────────

const ingredientLineSchema = z.object({
  ingredientId: z.string().cuid(),
  gramsInBase: z.number().positive(),
})

const recipeBaseSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  steps: z.string().max(5000).optional(),
  baseServings: z.number().int().min(1).max(100),
  category: z.string().optional(),
  isPrivate: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isHealthy: z.boolean().optional(),
  isLowCarb: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  isQuickMeal: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
  ingredients: z.array(ingredientLineSchema).min(1),
})

// ─── Router ───────────────────────────────────────────────────────────────────

export const recipeRouter = createTRPCRouter({

  create: protectedProcedure
    .input(recipeBaseSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await RecipeService.create(ctx.session.user.id, input)
      } catch (e) {
        throw new TRPCError({ code: "BAD_REQUEST", message: (e as Error).message })
      }
    }),

  update: protectedProcedure
    .input(recipeBaseSchema.partial().extend({ recipeId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { recipeId, ...data } = input
      try {
        return await RecipeService.update(ctx.session.user.id, recipeId, data)
      } catch (e) {
        throw new TRPCError({ code: "NOT_FOUND", message: (e as Error).message })
      }
    }),

  delete: protectedProcedure
    .input(z.object({ recipeId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await RecipeService.delete(ctx.session.user.id, input.recipeId)
        return { success: true }
      } catch (e) {
        throw new TRPCError({ code: "NOT_FOUND", message: (e as Error).message })
      }
    }),

  getOne: protectedProcedure
    .input(z.object({ recipeId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const recipe = await RecipeService.getOne(ctx.session.user.id, input.recipeId)
      if (!recipe) throw new TRPCError({ code: "NOT_FOUND", message: "Receta no encontrada." })
      return recipe
    }),

  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      return RecipeService.getAll(ctx.session.user.id)
    }),

  scaleByServings: protectedProcedure
    .input(z.object({
      recipeId: z.string().cuid(),
      targetServings: z.number().int().min(1).max(500),
    }))
    .query(async ({ ctx, input }) => {
      try {
        return await RecipeService.scaleByServings(
          ctx.session.user.id,
          input.recipeId,
          input.targetServings
        )
      } catch (e) {
        throw new TRPCError({ code: "BAD_REQUEST", message: (e as Error).message })
      }
    }),

  scaleToKcal: protectedProcedure
    .input(z.object({
      recipeId: z.string().cuid(),
      targetKcalPerServing: z.number().positive(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        return await RecipeService.scaleToKcal(
          ctx.session.user.id,
          input.recipeId,
          input.targetKcalPerServing
        )
      } catch (e) {
        throw new TRPCError({ code: "BAD_REQUEST", message: (e as Error).message })
      }
    }),
})

