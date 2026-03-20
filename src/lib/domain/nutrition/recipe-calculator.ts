/**
 * recipe-calculator.ts
 * Cálculo dinámico de macros/kcal desde ingredientes.
 * Función pura: sin Prisma, sin efectos secundarios.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IngredientNutrition {
  id: string
  name: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g: number | null
}

export interface RecipeIngredientInput {
  ingredient: IngredientNutrition
  gramsInBase: number   // siempre en gramos
}

export interface NutritionTotals {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
}

export interface RecipeNutrition {
  perServing: NutritionTotals
  total: NutritionTotals
  totalWeightG: number
  servings: number
}

export interface ScaledIngredient {
  ingredientId: string
  name: string
  gramsScaled: number
  nutrition: NutritionTotals
}

export interface ScaledRecipe {
  servings: number
  targetKcal?: number
  scaleFactor: number
  ingredients: ScaledIngredient[]
  nutrition: RecipeNutrition
}

// Tamaños de unidad en gramos — usados en la UI, convertidos antes de guardar
export const UNIT_SIZES_G = {
  SMALL:  50,
  MEDIUM: 100,
  LARGE:  150,
  XLARGE: 250,
} as const

export type UnitSize = keyof typeof UNIT_SIZES_G

// Pasos de incremento en gramos disponibles en la UI
export const INCREMENT_STEPS = [1, 5, 10, 25, 50, 100] as const
export type IncrementStep = typeof INCREMENT_STEPS[number]

// ─── Core calculations ────────────────────────────────────────────────────────

/**
 * Calcula los macros de UN ingrediente para una cantidad de gramos dada.
 */
export function calculateIngredientNutrition(
  ingredient: IngredientNutrition,
  grams: number
): NutritionTotals {
  const factor = grams / 100
  return {
    kcal:     ingredient.kcalPer100g     * factor,
    proteinG: ingredient.proteinPer100g  * factor,
    carbsG:   ingredient.carbsPer100g    * factor,
    fatG:     ingredient.fatPer100g      * factor,
    fiberG:   (ingredient.fiberPer100g ?? 0) * factor,
  }
}

/**
 * Suma los totales nutricionales de todos los ingredientes de la receta.
 */
function sumNutrition(items: NutritionTotals[]): NutritionTotals {
  return items.reduce(
    (acc, n) => ({
      kcal:     acc.kcal     + n.kcal,
      proteinG: acc.proteinG + n.proteinG,
      carbsG:   acc.carbsG   + n.carbsG,
      fatG:     acc.fatG     + n.fatG,
      fiberG:   acc.fiberG   + n.fiberG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
  )
}

function roundNutrition(n: NutritionTotals, decimals = 1): NutritionTotals {
  const f = 10 ** decimals
  return {
    kcal:     Math.round(n.kcal     * f) / f,
    proteinG: Math.round(n.proteinG * f) / f,
    carbsG:   Math.round(n.carbsG   * f) / f,
    fatG:     Math.round(n.fatG     * f) / f,
    fiberG:   Math.round(n.fiberG   * f) / f,
  }
}

/**
 * Calcula la nutrición total y por porción de una receta.
 * Los gramos son siempre los de la receta base (baseServings).
 */
export function calculateRecipeNutrition(
  ingredients: RecipeIngredientInput[],
  baseServings: number
): RecipeNutrition {
  const totalWeightG = ingredients.reduce((s, i) => s + i.gramsInBase, 0)

  const perIngredient = ingredients.map((i) =>
    calculateIngredientNutrition(i.ingredient, i.gramsInBase)
  )

  const total = roundNutrition(sumNutrition(perIngredient))

  const perServing = roundNutrition({
    kcal:     total.kcal     / baseServings,
    proteinG: total.proteinG / baseServings,
    carbsG:   total.carbsG   / baseServings,
    fatG:     total.fatG     / baseServings,
    fiberG:   total.fiberG   / baseServings,
  })

  return { perServing, total, totalWeightG, servings: baseServings }
}

/**
 * Escala la receta para un número de porciones diferente al base.
 * Multiplica cada ingrediente por el factor de escala.
 */
export function scaleRecipeByServings(
  ingredients: RecipeIngredientInput[],
  baseServings: number,
  targetServings: number
): ScaledRecipe {
  const scaleFactor = targetServings / baseServings

  const scaled: ScaledIngredient[] = ingredients.map((i) => {
    const gramsScaled = i.gramsInBase * scaleFactor
    return {
      ingredientId: i.ingredient.id,
      name: i.ingredient.name,
      gramsScaled: Math.round(gramsScaled * 10) / 10,
      nutrition: roundNutrition(
        calculateIngredientNutrition(i.ingredient, gramsScaled)
      ),
    }
  })

  const nutrition = calculateRecipeNutrition(
    ingredients.map((i, idx) => ({
      ingredient: i.ingredient,
      gramsInBase: scaled[idx]!.gramsScaled,
    })),
    targetServings
  )

  return { servings: targetServings, scaleFactor, ingredients: scaled, nutrition }
}

/**
 * Escala la receta para alcanzar un objetivo calórico específico.
 * Útil para ajustar la receta al requerimiento metabólico del usuario.
 *
 * Ejemplo: receta base tiene 400kcal por porción,
 * usuario necesita 600kcal → scaleFactor = 1.5
 */
export function scaleRecipeToTargetKcal(
  ingredients: RecipeIngredientInput[],
  baseServings: number,
  targetKcalPerServing: number
): ScaledRecipe {
  const base = calculateRecipeNutrition(ingredients, baseServings)
  if (base.perServing.kcal === 0) {
    throw new Error("La receta no tiene calorías calculables.")
  }

  const scaleFactor = targetKcalPerServing / base.perServing.kcal
  const targetServings = baseServings  // mismo número de porciones, más gramos

  const scaled: ScaledIngredient[] = ingredients.map((i) => {
    const gramsScaled = i.gramsInBase * scaleFactor
    return {
      ingredientId: i.ingredient.id,
      name: i.ingredient.name,
      gramsScaled: Math.round(gramsScaled * 10) / 10,
      nutrition: roundNutrition(
        calculateIngredientNutrition(i.ingredient, gramsScaled)
      ),
    }
  })

  const nutrition = calculateRecipeNutrition(
    ingredients.map((i, idx) => ({
      ingredient: i.ingredient,
      gramsInBase: scaled[idx]!.gramsScaled,
    })),
    targetServings
  )

  return {
    servings: targetServings,
    targetKcal: targetKcalPerServing,
    scaleFactor,
    ingredients: scaled,
    nutrition,
  }
}

/**
 * Calcula el costo estimado de la receta en base a los precios de ingredientes.
 */
export function calculateRecipeCost(
  ingredients: (RecipeIngredientInput & { pricePerKg: number | null })[],
  servings: number
): { totalCost: number; costPerServing: number } {
  const totalCost = ingredients.reduce((sum, i) => {
    if (!i.pricePerKg) return sum
    return sum + (i.gramsInBase / 1000) * i.pricePerKg
  }, 0)

  return {
    totalCost:      Math.round(totalCost),
    costPerServing: Math.round(totalCost / servings),
  }
}
