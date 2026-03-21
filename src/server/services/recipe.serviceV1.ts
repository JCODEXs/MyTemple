import { db } from "@/server/db"
import {
  calculateRecipeNutrition,
  scaleRecipeByServings,
  scaleRecipeToTargetKcal,
  calculateRecipeCost,
  type RecipeIngredientInput,
} from "@/lib/domain/nutrition/recipe-calculator"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateRecipeInput {
  name: string
  description?: string
  steps?: string
  baseServings: number
  category?: string
  isPrivate?: boolean
  isVegan?: boolean
  isVegetarian?: boolean
  isHealthy?: boolean
  isLowCarb?: boolean
  isSpicy?: boolean
  isQuickMeal?: boolean
  imageUrl?: string
  ingredients: {
    ingredientId: string
    gramsInBase: number   // siempre en gramos — la UI ya convirtió unidades
  }[]
}

export interface UpdateRecipeInput extends Partial<Omit<CreateRecipeInput, "ingredients">> {
  ingredients?: CreateRecipeInput["ingredients"]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Carga los ingredientes de una receta con sus datos nutricionales.
 * Necesario para pasar al calculador del dominio.
 */
async function loadRecipeIngredients(
  recipeId: string,
  userId: string
): Promise<RecipeIngredientInput[]> {
  const items = await db.recipeIngredient.findMany({
    where: { recipeId },
    include: { ingredient: true },
  })

  // Buscar precios personalizados del usuario
  const overrides = await db.userIngredientOverride.findMany({
    where: {
      userId,
      ingredientId: { in: items.map((i) => i.ingredientId) },
    },
  })
  const overrideMap = new Map(overrides.map((o) => [o.ingredientId, o]))

  return items.map((item) => ({
    ingredient: {
      id: item.ingredient.id,
      name: item.ingredient.name,
      kcalPer100g: item.ingredient.kcalPer100g,
      proteinPer100g: item.ingredient.proteinPer100g,
      carbsPer100g: item.ingredient.carbsPer100g,
      fatPer100g: item.ingredient.fatPer100g,
      fiberPer100g: item.ingredient.fiberPer100g,
    },
    gramsInBase: item.gramsInBase,
    pricePerKg:
      overrideMap.get(item.ingredientId)?.customPricePerKg ??
      item.ingredient.defaultPricePerKg ??
      null,
  }))
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const RecipeService = {

  async create(userId: string, input: CreateRecipeInput) {
    if (input.ingredients.length === 0) {
      throw new Error("La receta debe tener al menos un ingrediente.")
    }

    // Verificar que todos los ingredientIds existen
    const ingredientIds = input.ingredients.map((i) => i.ingredientId)
    const found = await db.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true },
    })
    if (found.length !== ingredientIds.length) {
      throw new Error("Uno o más ingredientes no existen en la base de datos.")
    }

    return db.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          userId,
          name: input.name,
          description: input.description ?? null,
          steps: input.steps ?? null,
          baseServings: input.baseServings,
          category: input.category ?? null,
          isPrivate: input.isPrivate ?? false,
          isVegan: input.isVegan ?? false,
          isVegetarian: input.isVegetarian ?? false,
          isHealthy: input.isHealthy ?? false,
          isLowCarb: input.isLowCarb ?? false,
          isSpicy: input.isSpicy ?? false,
          isQuickMeal: input.isQuickMeal ?? false,
          imageUrl: input.imageUrl ?? null,
        },
      })

      await tx.recipeIngredient.createMany({
        data: input.ingredients.map((i) => ({
          recipeId: recipe.id,
          ingredientId: i.ingredientId,
          gramsInBase: i.gramsInBase,
        })),
      })

      return recipe
    })
  },

  async update(userId: string, recipeId: string, input: UpdateRecipeInput) {
    const recipe = await db.recipe.findFirst({ where: { id: recipeId, userId } })
    if (!recipe) throw new Error("Receta no encontrada.")

    return db.$transaction(async (tx) => {
      const { ingredients, ...meta } = input

      const updated = await tx.recipe.update({
        where: { id: recipeId },
        data: meta,
      })

      // Si vienen ingredientes, reemplazar completamente
      if (ingredients !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId } })
        await tx.recipeIngredient.createMany({
          data: ingredients.map((i) => ({
            recipeId,
            ingredientId: i.ingredientId,
            gramsInBase: i.gramsInBase,
          })),
        })
      }

      return updated
    })
  },

  async delete(userId: string, recipeId: string) {
    const recipe = await db.recipe.findFirst({ where: { id: recipeId, userId } })
    if (!recipe) throw new Error("Receta no encontrada.")
    return db.recipe.delete({ where: { id: recipeId } })
  },

  /**
   * Receta con ingredientes + nutrición calculada dinámicamente.
   * Nunca lee kcal de la DB — siempre del dominio.
   */
  async getOne(userId: string, recipeId: string) {
    const recipe = await db.recipe.findFirst({
      where: { id: recipeId, userId },
      include: {
        ingredients: { include: { ingredient: true } },
      },
    })
    if (!recipe) return null

    const domainIngredients = await loadRecipeIngredients(recipeId, userId)
    const nutrition = calculateRecipeNutrition(domainIngredients, recipe.baseServings)
    const cost = calculateRecipeCost(
      domainIngredients as Parameters<typeof calculateRecipeCost>[0],
      recipe.baseServings
    )

    return { ...recipe, nutrition, cost }
  },

  /**
   * Lista de recetas del usuario con nutrición por porción calculada.
   */
  async getAll(userId: string) {
    const recipes = await db.recipe.findMany({
      where: { userId },
      include: { ingredients: { include: { ingredient: true } } },
      orderBy: { updatedAt: "desc" },
    })

    return Promise.all(
      recipes.map(async (recipe) => {
        const domainIngredients = await loadRecipeIngredients(recipe.id, userId)
        const nutrition = calculateRecipeNutrition(domainIngredients, recipe.baseServings)
        const cost = calculateRecipeCost(
          domainIngredients as Parameters<typeof calculateRecipeCost>[0],
          recipe.baseServings
        )
        return { ...recipe, nutrition, cost }
      })
    )
  },

  /**
   * Escala la receta a N porciones. Devuelve los gramos de cada ingrediente escalados.
   */
  async scaleByServings(userId: string, recipeId: string, targetServings: number) {
    const recipe = await db.recipe.findFirst({ where: { id: recipeId, userId } })
    if (!recipe) throw new Error("Receta no encontrada.")

    const domainIngredients = await loadRecipeIngredients(recipeId, userId)
    return scaleRecipeByServings(domainIngredients, recipe.baseServings, targetServings)
  },

  /**
   * Escala la receta para alcanzar un objetivo calórico por porción.
   * Usado por el planificador nutricional.
   */
  async scaleToKcal(userId: string, recipeId: string, targetKcalPerServing: number) {
    const recipe = await db.recipe.findFirst({ where: { id: recipeId, userId } })
    if (!recipe) throw new Error("Receta no encontrada.")

    const domainIngredients = await loadRecipeIngredients(recipeId, userId)
    return scaleRecipeToTargetKcal(
      domainIngredients,
      recipe.baseServings,
      targetKcalPerServing
    )
  },
}
