import { db }        from "@/server/db"
import { TRPCError } from "@trpc/server"
import {
  calculateRecipeNutrition,
  calculateRecipeCost,
  scaleRecipeByServings,
  scaleRecipeToTargetKcal,
  type RecipeIngredientInput,
} from "@/lib/domain/nutrition/recipe-calculator"


// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateRecipeInput {
  name:         string
  description?: string
  steps?:       string
  baseServings: number
  category?:    string
  isPrivate?:   boolean
  isVegan?:     boolean
  isVegetarian?: boolean
  isHealthy?:   boolean
  isLowCarb?:   boolean
  isSpicy?:     boolean
  isQuickMeal?: boolean
  imageUrl?:    string
  ingredients:  { ingredientId: string; gramsInBase: number }[]
}

export interface UpdateRecipeInput extends Partial<Omit<CreateRecipeInput, "ingredients">> {
  ingredients?: CreateRecipeInput["ingredients"]
}

// ─── Helper — build domain inputs from raw DB rows ────────────────────────────

/**
 * Convierte rows de DB al formato que espera el dominio.
 * Aplicar overrides de precio del usuario si existen.
 */
function buildDomainIngredients(
  recipeIngredients: {
    gramsInBase: number
    ingredient: {
      id: string; name: string
      kcalPer100g: number; proteinPer100g: number
      carbsPer100g: number; fatPer100g: number
      fiberPer100g: number | null
      defaultPricePerKg: number | null
    }
  }[],
  overrideMap: Map<string, number | null>
): (RecipeIngredientInput & { pricePerKg: number | null })[] {
  return recipeIngredients.map((ri) => ({
    ingredient: {
      id:             ri.ingredient.id,
      name:           ri.ingredient.name,
      kcalPer100g:    ri.ingredient.kcalPer100g,
      proteinPer100g: ri.ingredient.proteinPer100g,
      carbsPer100g:   ri.ingredient.carbsPer100g,
      fatPer100g:     ri.ingredient.fatPer100g,
      fiberPer100g:   ri.ingredient.fiberPer100g,
    },
    gramsInBase: ri.gramsInBase,
    pricePerKg:
      overrideMap.has(ri.ingredient.id)
        ? overrideMap.get(ri.ingredient.id) ?? null
        : ri.ingredient.defaultPricePerKg,
  }))
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const RecipeService = {

  async create(userId: string, input: CreateRecipeInput) {
    if (input.ingredients.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "La receta debe tener al menos un ingrediente.",
      })
    }

    const found = await db.ingredient.findMany({
      where:  { id: { in: input.ingredients.map((i) => i.ingredientId) } },
      select: { id: true },
    })
    if (found.length !== input.ingredients.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Uno o más ingredientes no existen.",
      })
    }

    return db.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          userId,
          name:        input.name,
          description: input.description  ?? null,
          steps:       input.steps        ?? null,
          baseServings: input.baseServings,
          category:    input.category     ?? null,
          isPrivate:   input.isPrivate    ?? false,
          isVegan:     input.isVegan      ?? false,
          isVegetarian: input.isVegetarian ?? false,
          isHealthy:   input.isHealthy    ?? false,
          isLowCarb:   input.isLowCarb    ?? false,
          isSpicy:     input.isSpicy      ?? false,
          isQuickMeal: input.isQuickMeal  ?? false,
          imageUrl:    input.imageUrl     ?? null,
        },
      })

      await tx.recipeIngredient.createMany({
        data: input.ingredients.map((i) => ({
          recipeId:    recipe.id,
          ingredientId: i.ingredientId,
          gramsInBase: i.gramsInBase,
        })),
      })

      return recipe
    })
  },

  async update(userId: string, recipeId: string, input: UpdateRecipeInput) {
    const recipe = await db.recipe.findFirst({ where: { id: recipeId, userId } })
    if (!recipe) throw new TRPCError({ code: "NOT_FOUND", message: "Receta no encontrada." })

    return db.$transaction(async (tx) => {
      const { ingredients, ...meta } = input
      const updated = await tx.recipe.update({ where: { id: recipeId }, data: meta })

      if (ingredients !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId } })
        await tx.recipeIngredient.createMany({
          data: ingredients.map((i) => ({
            recipeId,
            ingredientId: i.ingredientId,
            gramsInBase:  i.gramsInBase,
          })),
        })
      }

      return updated
    })
  },

  async delete(userId: string, recipeId: string) {
    const recipe = await db.recipe.findFirst({ where: { id: recipeId, userId } })
    if (!recipe) throw new TRPCError({ code: "NOT_FOUND", message: "Receta no encontrada." })
    return db.recipe.delete({ where: { id: recipeId } })
  },

  // ─── OPTIMIZED getAll — 3 queries total regardless of recipe count ──────────

  async getAll(userId: string) {
    // Query 1 — todas las recetas del usuario
    const recipes = await db.recipe.findMany({
      where:   { userId },
      orderBy: { updatedAt: "desc" },
    })

    if (recipes.length === 0) return []

    const recipeIds = recipes.map((r) => r.id)

    // Query 2 — todos los ingredientes de todas las recetas en una sola query
    const allRecipeIngredients = await db.recipeIngredient.findMany({
      where:   { recipeId: { in: recipeIds } },
      include: { ingredient: true },
    })

    // Query 3 — todos los overrides del usuario en una sola query
    const ingredientIds = [...new Set(allRecipeIngredients.map((ri) => ri.ingredientId))]
    const overrides     = await db.userIngredientOverride.findMany({
      where: { userId, ingredientId: { in: ingredientIds } },
    })

    // Build maps en memoria — O(n) una sola vez
    const overrideMap = new Map(
      overrides.map((o) => [o.ingredientId, o.customPricePerKg])
    )

    const ingredientsByRecipe = new Map<string, typeof allRecipeIngredients>()
    for (const ri of allRecipeIngredients) {
      const list = ingredientsByRecipe.get(ri.recipeId) ?? []
      list.push(ri)
      ingredientsByRecipe.set(ri.recipeId, list)
    }

    // Calcular nutrición en memoria — sin queries adicionales
    return recipes.map((recipe) => {
      const ris     = ingredientsByRecipe.get(recipe.id) ?? []
      const domain  = buildDomainIngredients(ris, overrideMap)
      const nutrition = calculateRecipeNutrition(domain, recipe.baseServings)
      const cost    = calculateRecipeCost(domain, recipe.baseServings)

      return {
        ...recipe,
        ingredients: ris.map((ri) => ({
          id:          ri.id,
          ingredientId: ri.ingredientId,
          gramsInBase: ri.gramsInBase,
          ingredient:  ri.ingredient,
        })),
        nutrition,
        cost,
      }
    })
  },

  // ─── OPTIMIZED getOne — same pattern, single recipe ────────────────────────

  async getOne(userId: string, recipeId: string) {
    const recipe = await db.recipe.findFirst({
      where: { id: recipeId, userId },
    })
    if (!recipe) return null

    const [ris, overrides] = await Promise.all([
      db.recipeIngredient.findMany({
        where:   { recipeId },
        include: { ingredient: true },
      }),
      db.userIngredientOverride.findMany({
        where: {
          userId,
          ingredientId: { in: [] }, // filled below
        },
      }),
    ])

    const ingredientIds = ris.map((ri) => ri.ingredientId)
    const overridesReal = await db.userIngredientOverride.findMany({
      where: { userId, ingredientId: { in: ingredientIds } },
    })

    const overrideMap = new Map(
      overridesReal.map((o) => [o.ingredientId, o.customPricePerKg])
    )

    const domain    = buildDomainIngredients(ris, overrideMap)
    const nutrition = calculateRecipeNutrition(domain, recipe.baseServings)
    const cost      = calculateRecipeCost(domain, recipe.baseServings)

    return {
      ...recipe,
      ingredients: ris.map((ri) => ({
        id:           ri.id,
        ingredientId: ri.ingredientId,
        gramsInBase:  ri.gramsInBase,
        ingredient:   ri.ingredient,
      })),
      nutrition,
      cost,
    }
  },

  async scaleByServings(userId: string, recipeId: string, targetServings: number) {
    const recipe = await db.recipe.findFirst({ where: { id: recipeId, userId } })
    if (!recipe) throw new TRPCError({ code: "NOT_FOUND", message: "Receta no encontrada." })

    const ris = await db.recipeIngredient.findMany({
      where:   { recipeId },
      include: { ingredient: true },
    })

    const domain = buildDomainIngredients(ris, new Map())
    return scaleRecipeByServings(domain, recipe.baseServings, targetServings)
  },

  async scaleToKcal(userId: string, recipeId: string, targetKcalPerServing: number) {
    const recipe = await db.recipe.findFirst({ where: { id: recipeId, userId } })
    if (!recipe) throw new TRPCError({ code: "NOT_FOUND", message: "Receta no encontrada." })

    const ris = await db.recipeIngredient.findMany({
      where:   { recipeId },
      include: { ingredient: true },
    })

    const domain = buildDomainIngredients(ris, new Map())
    return scaleRecipeToTargetKcal(domain, recipe.baseServings, targetKcalPerServing)
  },
    // ── Get community/seed recipes ────────────────────────────────────────────

  async getCommunityRecipes() {
    const recipes = await db.recipe.findMany({
      where:   { isCommunity: true },
      orderBy: { category: "asc" },
    })

    if (recipes.length === 0) return []

    const recipeIds = recipes.map((r) => r.id)

    const allRIs = await db.recipeIngredient.findMany({
      where:   { recipeId: { in: recipeIds } },
      include: { ingredient: true },
    })

    // Community recipes: no overrides to check (not user-specific)
    const ingredientsByRecipe = new Map<string, typeof allRIs>()
    for (const ri of allRIs) {
      const list = ingredientsByRecipe.get(ri.recipeId) ?? []
      list.push(ri)
      ingredientsByRecipe.set(ri.recipeId, list)
    }

    return recipes.map((recipe) => {
      const ris       = ingredientsByRecipe.get(recipe.id) ?? []
      const domain    = ris.map((ri) => ({
        ingredient: {
          id:             ri.ingredient.id,
          name:           ri.ingredient.name,
          kcalPer100g:    ri.ingredient.kcalPer100g,
          proteinPer100g: ri.ingredient.proteinPer100g,
          carbsPer100g:   ri.ingredient.carbsPer100g,
          fatPer100g:     ri.ingredient.fatPer100g,
          fiberPer100g:   ri.ingredient.fiberPer100g,
        },
        gramsInBase: ri.gramsInBase,
        pricePerKg:  ri.ingredient.defaultPricePerKg,
      }))
      const nutrition = calculateRecipeNutrition(domain, recipe.baseServings)
      const cost      = calculateRecipeCost(domain, recipe.baseServings)

      return {
        ...recipe,
        ingredients: ris.map((ri) => ({
          id:           ri.id,
          ingredientId: ri.ingredientId,
          gramsInBase:  ri.gramsInBase,
          ingredient:   ri.ingredient,
        })),
        nutrition,
        cost,
      }
    })
  },

  // ── Import community recipe — creates a personal copy ─────────────────────

  async importFromCommunity(userId: string, sourceRecipeId: string) {
    // Verify source exists and is a community recipe
    const source = await db.recipe.findFirst({
      where:   { id: sourceRecipeId, isCommunity: true },
      include: { ingredients: true },
    })
    if (!source) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Receta no encontrada." })
    }

    // Check if already imported
    const existing = await db.recipe.findFirst({
      where: { userId, sourceRecipeId },
    })
    if (existing) {
      throw new TRPCError({
        code:    "CONFLICT",
        message: "Ya tienes esta receta en tu colección.",
      })
    }

    // Create personal copy — does NOT set isCommunity
    return db.$transaction(async (tx) => {
      const copy = await tx.recipe.create({
        data: {
          userId,
          name:          source.name,
          description:   source.description,
          steps:         source.steps,
          baseServings:  source.baseServings,
          category:      source.category,
          isPrivate:     false,
          isVegan:       source.isVegan,
          isVegetarian:  source.isVegetarian,
          isHealthy:     source.isHealthy,
          isLowCarb:     source.isLowCarb,
          isSpicy:       source.isSpicy,
          isQuickMeal:   source.isQuickMeal,
          imageUrl:      source.imageUrl,
          isCommunity:   false,       // ← personal copy is NOT community
          sourceRecipeId: source.id,  // ← tracks origin
        },
      })

      // Copy all ingredients exactly
      await tx.recipeIngredient.createMany({
        data: source.ingredients.map((ri) => ({
          recipeId:    copy.id,
          ingredientId: ri.ingredientId,
          gramsInBase: ri.gramsInBase,
        })),
      })

      return copy
    })
  },
}
