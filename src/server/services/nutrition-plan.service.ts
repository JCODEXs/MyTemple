/* eslint-disable @typescript-eslint/dot-notation */
import { db } from "@/server/db"
import { randomBytes } from "crypto"
import { TRPCError } from "@trpc/server"
import {
  generatePlan,
  calculateDailyTarget,
  GOAL_MACRO_SPLITS,
  MEAL_SLOTS,
  type MealSlotId,
  type RecipeCandidate,
} from "@/lib/domain/nutrition/plan-generator"
import {
  scaleRecipeToTargetKcal,
  calculateRecipeNutrition,
  type RecipeIngredientInput,
} from "@/lib/domain/nutrition/recipe-calculator"
import type { MealType } from "../../../generated/prisma"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatePlanInput {
  name:         string
  startDate:    Date
  endDate:      Date
  targetKcal?:  number   // si no viene, se calcula desde el perfil
  proteinPct:   number
  carbsPct:     number
  fatPct:       number
}

export interface PlanDayForForm {
  date:         Date
  meals:        {
    mealType:   MealType
    recipes:    {
      recipeId:   string
      recipeName: string
      servings:   number
      kcal:       number
      proteinG:   number
      carbsG:     number
      fatG:       number
    }[]
  }[]
  totalKcal:    number
  totalProteinG: number
  totalCarbsG:   number
  totalFatG:     number
}
type PlanDayInput = {
  date: Date
  meals: Array<{
    mealType: MealType
    recipes: Array<{ recipeId: string; servings: number }>
  }>
}
// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}


function generateId(): string {
  return randomBytes(12).toString("base64url")
}
async function loadRecipeCandidates(userId: string): Promise<RecipeCandidate[]> {
  const recipes = await db.recipe.findMany({
    where: { userId },
    include: {
      ingredients: {
        include: { ingredient: true },
      },
    },
  })

  return recipes.map((r) => ({
    id:           r.id,
    name:         r.name,
    baseServings: r.baseServings,
    ingredients:  r.ingredients.map((ri) => ({
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
    })) satisfies RecipeIngredientInput[],
  }))
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const NutritionPlanService = {

  /**
   * Genera una sugerencia de plan SIN guardarla.
   * El usuario la revisa y la acepta o ajusta antes de persistir.
   */
  async generateSuggestion(userId: string, input: {
    startDate:    Date
    durationDays: number
    targetKcal?:  number
  }) {
    const [profile, recipes] = await Promise.all([
      db.userProfile.findUnique({ where: { userId } }),
      loadRecipeCandidates(userId),
    ])

    if (!profile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Completa tu perfil primero." })
    }
    if (recipes.length === 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Necesitas al menos una receta guardada para generar un plan.",
      })
    }

    // Calcular TDEE si no viene el target
    const tdee = (10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age +
      (profile.sex === "MALE" ? 5 : -161)) * profile.activityFactor * profile.metabolicAdjustment

    const targetKcal = input.targetKcal ??
      calculateDailyTarget(tdee, profile.goal)
      const durationDays=input.durationDays 

    return generatePlan(
      recipes,
      targetKcal,
      toDateOnly(input.startDate),
      durationDays,
      true
    )
  },

  /**
   * Crea y persiste un plan nutricional completo a partir de una sugerencia aceptada.
   */
  async createFromSuggestion(userId: string, input: CreatePlanInput & { days: PlanDayInput[] }) {
  const profile = await db.userProfile.findUnique({ where: { userId } })
  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Perfil no encontrado." })
// eslint-disable-next-line @typescript-eslint/dot-notation
  const macroSplit = GOAL_MACRO_SPLITS[profile.goal] ?? GOAL_MACRO_SPLITS["MAINTENANCE"]!

  return db.$transaction(async (tx) => {
    // 1. Crear el plan
    const plan = await tx.nutritionPlan.create({
      data: {
        userId,
        name: input.name,
        startDate: toDateOnly(input.startDate),
        endDate: toDateOnly(input.endDate),
        targetKcal: input.targetKcal ?? 2000,
        proteinPct: input.proteinPct ?? macroSplit.proteinPct,
        carbsPct: input.carbsPct ?? macroSplit.carbsPct,
        fatPct: input.fatPct ?? macroSplit.fatPct,
      },
    })

    // 2. Crear días y meals en una sola operación
    const planDaysData = input.days.map((day) => ({
      id: generateId(),
      planId: plan.id,
      date: toDateOnly(day.date),
    }))

    await tx.planDay.createMany({ data: planDaysData })

    // 3. Obtener los días creados (más eficiente que findMany después de createMany)
    const planDays = await tx.planDay.findMany({
      where: { planId: plan.id },
      orderBy: { date: "asc" },
    })

    // 4. Crear comidas con sus relaciones directamente
    const mealsWithRecipes = planDays.flatMap((planDay, dayIndex) => {
      const inputDay = input.days[dayIndex]
      if (!inputDay) return []
      
      return inputDay.meals.map((meal) => ({
        meal: {
          id: generateId(),
          dayId: planDay.id,
          mealType: meal.mealType,
        },
        recipes: meal.recipes.map((r, order) => ({
          id: generateId(),
          recipeId: r.recipeId,
          servings: r.servings,
          order,
        }))
      }))
    })

    // 5. Insertar comidas
    const mealsData = mealsWithRecipes.map(mwr => mwr.meal)
    if (mealsData.length > 0) {
      await tx.meal.createMany({ data: mealsData })
    }

    // 6. Obtener las comidas creadas para enlazar recipes
    const meals = await tx.meal.findMany({
      where: { dayId: { in: planDays.map(d => d.id) } }
    })

    // 7. Insertar mealRecipes
    const mealRecipesData = meals.flatMap(meal => {
      const mealWithRecipes = mealsWithRecipes.find(mwr => mwr.meal.id === meal.id)
      if (!mealWithRecipes) return []
      return mealWithRecipes.recipes.map(recipe => ({
        ...recipe,
        mealId: meal.id
      }))
    })

    if (mealRecipesData.length > 0) {
      await tx.mealRecipe.createMany({ data: mealRecipesData })
    }

    return plan
  }, {
    timeout: 30000,
    maxWait: 10000,
  })
},
  // async createFromSuggestion(userId: string, input: CreatePlanInput & {
  //   days: {
  //     date:   Date
  //     meals: {
  //       mealType: MealType
  //       recipes: { recipeId: string; servings: number }[]
  //     }[]
  //   }[]
  // }) {
  //   const profile = await db.userProfile.findUnique({ where: { userId } })
  //   if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Perfil no encontrado." })

  //   const macroSplit = GOAL_MACRO_SPLITS[profile.goal] ??
  //     GOAL_MACRO_SPLITS["MAINTENANCE"]!

  //   return db.$transaction(async (tx) => {
  //     const plan = await tx.nutritionPlan.create({
  //       data: {
  //         userId,
  //         name:       input.name,
  //         startDate:  toDateOnly(input.startDate),
  //         endDate:    toDateOnly(input.endDate),
  //         targetKcal: input.targetKcal ?? 2000,
  //         proteinPct: input.proteinPct ?? macroSplit.proteinPct,
  //         carbsPct:   input.carbsPct   ?? macroSplit.carbsPct,
  //         fatPct:     input.fatPct     ?? macroSplit.fatPct,
  //       },
  //     })

  //     for (const day of input.days) {
  //       const planDay = await tx.planDay.create({
  //         data: {
  //           planId: plan.id,
  //           date:   toDateOnly(day.date),
  //         },
  //       })

  //       for (const meal of day.meals) {
  //         const mealRecord = await tx.meal.create({
  //           data: {
  //             dayId:    planDay.id,
  //             mealType: meal.mealType,
  //           },
  //         })

  //         if (meal.recipes.length > 0) {
  //           await tx.mealRecipe.createMany({
  //             data: meal.recipes.map((r, i) => ({
  //               mealId:   mealRecord.id,
  //               recipeId: r.recipeId,
  //               servings: r.servings,
  //               order:    i,
  //             })),
  //           })
  //         }
  //       }
  //     }

  //     return plan
  //   })
  // },

  /**
   * Lista planes del usuario.
   */
  async getAll(userId: string) {
    return db.nutritionPlan.findMany({
      where:   { userId },
      orderBy: { startDate: "desc" },
    })
  },

  /**
   * Plan completo con todos sus días, comidas y recetas con nutrición calculada.
   */
  async getOne(userId: string, planId: string) {
    const plan = await db.nutritionPlan.findFirst({
      where: { id: planId, userId },
      include: {
        days: {
          orderBy: { date: "asc" },
          include: {
            meals: {
              orderBy: { mealType: "asc" },
              include: {
                recipes: {
                  orderBy: { order: "asc" },
                  include: {
                    recipe: {
                      include: {
                        ingredients: { include: { ingredient: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan no encontrado." })

    // Calcular nutrición dinámica para cada receta en el plan
    const enrichedDays = plan.days.map((day) => {
      const enrichedMeals = day.meals.map((meal) => {
        const enrichedRecipes = meal.recipes.map((mr) => {
          const ingredients: RecipeIngredientInput[] = mr.recipe.ingredients.map((ri) => ({
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
          }))

          const baseNutrition = calculateRecipeNutrition(
            ingredients,
            mr.recipe.baseServings
          )
          const ps = baseNutrition.perServing

          return {
            mealRecipeId: mr.id,
            recipeId:     mr.recipe.id,
            recipeName:   mr.recipe.name,
            recipeEmoji:  mr.recipe.category ?? "🍽️",
            servings:     mr.servings,
            kcal:         ps.kcal     * mr.servings,
            proteinG:     ps.proteinG * mr.servings,
            carbsG:       ps.carbsG   * mr.servings,
            fatG:         ps.fatG     * mr.servings,
          }
        })

        const mealTotals = enrichedRecipes.reduce(
          (acc, r) => ({
            kcal:     acc.kcal     + r.kcal,
            proteinG: acc.proteinG + r.proteinG,
            carbsG:   acc.carbsG   + r.carbsG,
            fatG:     acc.fatG     + r.fatG,
          }),
          { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
        )

        return { ...meal, recipes: enrichedRecipes, totals: mealTotals }
      })

      const dayTotals = enrichedMeals.reduce(
        (acc, m) => ({
          kcal:     acc.kcal     + m.totals.kcal,
          proteinG: acc.proteinG + m.totals.proteinG,
          carbsG:   acc.carbsG   + m.totals.carbsG,
          fatG:     acc.fatG     + m.totals.fatG,
        }),
        { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
      )

      return { ...day, meals: enrichedMeals, totals: dayTotals }
    })

    return { ...plan, days: enrichedDays }
  },

  /**
   * Obtiene el plan activo para una fecha específica.
   * Usado por DailyLogForm para pre-cargar el estado inicial.
   */
  async getPlanForDate(userId: string, date: Date): Promise<PlanDayForForm | null> {
    const normalizedDate = toDateOnly(date)

    const planDay = await db.planDay.findFirst({
      where: {
        date: normalizedDate,
        plan: { userId },
      },
      include: {
        meals: {
          orderBy: { mealType: "asc" },
          include: {
            recipes: {
              orderBy: { order: "asc" },
              include: {
                recipe: {
                  include: {
                    ingredients: { include: { ingredient: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!planDay) return null

    const meals = planDay.meals.map((meal) => {
      const recipes = meal.recipes.map((mr) => {
        const ingredients: RecipeIngredientInput[] = mr.recipe.ingredients.map((ri) => ({
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
        }))

        const nutrition = calculateRecipeNutrition(ingredients, mr.recipe.baseServings)
        const ps        = nutrition.perServing

        return {
          recipeId:   mr.recipe.id,
          recipeName: mr.recipe.name,
          servings:   mr.servings,
          kcal:       ps.kcal     * mr.servings,
          proteinG:   ps.proteinG * mr.servings,
          carbsG:     ps.carbsG   * mr.servings,
          fatG:       ps.fatG     * mr.servings,
        }
      })

      return { mealType: meal.mealType, recipes }
    })

    const totals = meals.flatMap((m) => m.recipes).reduce(
      (acc, r) => ({
        kcal:     acc.kcal     + r.kcal,
        proteinG: acc.proteinG + r.proteinG,
        carbsG:   acc.carbsG   + r.carbsG,
        fatG:     acc.fatG     + r.fatG,
      }),
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    )

    return {
      date:         normalizedDate,
      meals,
      totalKcal:    Math.round(totals.kcal),
      totalProteinG: Math.round(totals.proteinG * 10) / 10,
      totalCarbsG:   Math.round(totals.carbsG   * 10) / 10,
      totalFatG:     Math.round(totals.fatG      * 10) / 10,
    }
  },

  /**
   * Elimina un plan completo.
   */
  async delete(userId: string, planId: string) {
    const plan = await db.nutritionPlan.findFirst({ where: { id: planId, userId } })
    if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan no encontrado." })
    return db.nutritionPlan.delete({ where: { id: planId } })
  },
}
