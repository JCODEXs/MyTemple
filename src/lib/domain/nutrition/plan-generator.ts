/**
 * plan-generator.ts
 * Lógica pura de generación y distribución de planes nutricionales.
 * Sin Prisma, sin efectos secundarios.
 */

import {
  scaleRecipeToTargetKcal,
  calculateRecipeNutrition,
  type RecipeIngredientInput,
  type ScaledRecipe,
} from "./recipe-calculator"

// ─── Types ────────────────────────────────────────────────────────────────────

export type MealSlotId = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "SUPPLEMENT"

export interface MealSlotConfig {
  id:          MealSlotId
  label:       string
  emoji:       string
  kcalPct:     number   // % del target diario asignado a este slot
  order:       number
}

export interface RecipeCandidate {
  id:          string
  name:        string
  baseServings: number
  ingredients: RecipeIngredientInput[]
}

export interface SuggestedMeal {
  slotId:      MealSlotId
  recipe:      RecipeCandidate
  scaled:      ScaledRecipe
  targetKcal:  number
}

export interface DaySuggestion {
  dayIndex:    number   // 0 = lunes, 6 = domingo
  date:        Date
  meals:       SuggestedMeal[]
  totalKcal:   number
  totalProteinG: number
  totalCarbsG:   number
  totalFatG:     number
}

export interface PlanSuggestion {
  targetKcalPerDay: number
  days:             DaySuggestion[]
  coverageScore:    number   // 0–1, qué tan bien se cubrieron los slots
}

export interface MacroSplit {
  proteinPct: number
  carbsPct:   number
  fatPct:     number
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MEAL_SLOTS: MealSlotConfig[] = [
  { id: "BREAKFAST",  label: "Desayuno",      emoji: "🌅", kcalPct: 0.25, order: 0 },
  { id: "LUNCH",      label: "Almuerzo",      emoji: "☀️", kcalPct: 0.35, order: 1 },
  { id: "DINNER",     label: "Cena",          emoji: "🌙", kcalPct: 0.30, order: 2 },
  { id: "SNACK",      label: "Snack",         emoji: "🍎", kcalPct: 0.10, order: 3 },
  { id: "SUPPLEMENT", label: "Suplemento",    emoji: "💊", kcalPct: 0.00, order: 4 },
]

// Targets de macros según objetivo
export const GOAL_MACRO_SPLITS: Record<string, MacroSplit> = {
  FAT_LOSS:    { proteinPct: 0.35, carbsPct: 0.35, fatPct: 0.30 },
  MUSCLE_GAIN: { proteinPct: 0.30, carbsPct: 0.45, fatPct: 0.25 },
  WEIGHT_LOSS: { proteinPct: 0.30, carbsPct: 0.40, fatPct: 0.30 },
  MAINTENANCE: { proteinPct: 0.25, carbsPct: 0.50, fatPct: 0.25 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calcula el target calórico diario ajustado al objetivo.
 * deficit/superavit aplicado sobre el TDEE.
 */
export function calculateDailyTarget(tdee: number, goal: string): number {
  switch (goal) {
    case "FAT_LOSS":    return Math.round(tdee * 0.80)  // déficit 20%
    case "WEIGHT_LOSS": return Math.round(tdee * 0.85)  // déficit 15%
    case "MUSCLE_GAIN": return Math.round(tdee * 1.10)  // superávit 10%
    case "MAINTENANCE": return Math.round(tdee)
    default:            return Math.round(tdee)
  }
}

/**
 * Distribución de kcal por slot para un target diario dado.
 */
export function distributeKcalBySlot(
  targetKcalPerDay: number
): Record<MealSlotId, number> {
  const result = {} as Record<MealSlotId, number>
  for (const slot of MEAL_SLOTS) {
    result[slot.id] = Math.round(targetKcalPerDay * slot.kcalPct)
  }
  return result
}

/**
 * Elige la mejor receta de la lista para un target calórico dado.
 * "Mejor" = la que requiere menos factor de escala extremo.
 * Prefiere escalar entre 0.5x y 2x — más allá pierde coherencia culinaria.
 */
export function selectBestRecipeForTarget(
  recipes:     RecipeCandidate[],
  targetKcal:  number
): { recipe: RecipeCandidate; scaleFactor: number } | null {
  if (recipes.length === 0) return null

  let best: { recipe: RecipeCandidate; scaleFactor: number } | null = null
  let bestScore = Infinity

  for (const recipe of recipes) {
    const baseNutrition = calculateRecipeNutrition(
      recipe.ingredients,
      recipe.baseServings
    )
    const baseKcalPerServing = baseNutrition.perServing.kcal
    if (baseKcalPerServing === 0) continue

    const scaleFactor = targetKcal / baseKcalPerServing
    // Penalizar escalas extremas — ideal entre 0.5 y 2.5
    const penalty = scaleFactor < 0.3 || scaleFactor > 3
      ? Math.abs(scaleFactor - 1) * 10
      : Math.abs(scaleFactor - 1)

    if (penalty < bestScore) {
      bestScore = penalty
      best = { recipe, scaleFactor }
    }
  }

  return best
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Genera un plan nutricional semanal completo.
 *
 * @param recipes         - Recetas activas del usuario con sus ingredientes
 * @param targetKcalPerDay - Kcal objetivo por día
 * @param startDate       - Fecha de inicio del plan (lunes)
 * @param durationDays    - Duración en días (default: 7)
 * @param rotateDays      - Si true, rota las recetas entre días para variedad
 */
export function generatePlan(
  recipes:          RecipeCandidate[],
  targetKcalPerDay: number,
  startDate:        Date,
  durationDays:     number,
  rotateDays:       true
): PlanSuggestion {
  const kcalBySlot  = distributeKcalBySlot(targetKcalPerDay)
  const activeSlots = MEAL_SLOTS.filter((s) => s.kcalPct > 0)

  const days: DaySuggestion[] = []
  let totalSlotsAttempted = 0
  let totalSlotsFilled    = 0

  for (let d = 0; d < durationDays; d++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + d)

    const meals: SuggestedMeal[] = []

    for (const slot of activeSlots) {
      totalSlotsAttempted++
      const targetKcal = kcalBySlot[slot.id]

      // Rotar recetas entre días para variedad
      const offset  = rotateDays ? d % Math.max(1, recipes.length) : 0
      const rotated = [
        ...recipes.slice(offset),
        ...recipes.slice(0, offset),
      ]

      const best = selectBestRecipeForTarget(rotated, targetKcal)
      if (!best) continue

      try {
        const scaled = scaleRecipeToTargetKcal(
          best.recipe.ingredients,
          best.recipe.baseServings,
          targetKcal
        )

        meals.push({
          slotId:     slot.id,
          recipe:     best.recipe,
          scaled,
          targetKcal,
        })
        totalSlotsFilled++
      } catch {
        // Receta sin calorías calculables — saltar
      }
    }

    const totals = meals.reduce(
      (acc, m) => ({
        kcal:     acc.kcal     + m.scaled.nutrition.perServing.kcal,
        proteinG: acc.proteinG + m.scaled.nutrition.perServing.proteinG,
        carbsG:   acc.carbsG   + m.scaled.nutrition.perServing.carbsG,
        fatG:     acc.fatG     + m.scaled.nutrition.perServing.fatG,
      }),
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    )

    days.push({
      dayIndex: d,
      date,
      meals,
      totalKcal:     Math.round(totals.kcal),
      totalProteinG: Math.round(totals.proteinG * 10) / 10,
      totalCarbsG:   Math.round(totals.carbsG   * 10) / 10,
      totalFatG:     Math.round(totals.fatG      * 10) / 10,
    })
  }

  return {
    targetKcalPerDay,
    days,
    coverageScore: totalSlotsAttempted > 0
      ? totalSlotsFilled / totalSlotsAttempted
      : 0,
  }
}

/**
 * Macro targets en gramos desde kcal y split porcentual.
 */
export function macroTargetsFromKcal(
  kcal:  number,
  split: MacroSplit
): { proteinG: number; carbsG: number; fatG: number } {
  return {
    proteinG: Math.round((kcal * split.proteinPct) / 4),
    carbsG:   Math.round((kcal * split.carbsPct)   / 4),
    fatG:     Math.round((kcal * split.fatPct)      / 9),
  }
}
