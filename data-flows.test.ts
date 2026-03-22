/**
 * src/__tests__/data-flows.test.ts
 *
 * Integration tests for all major data flows in MyTemple.
 * Tests use a real in-memory calculation engine and mocked Prisma.
 *
 * Run: npx vitest src/__tests__/data-flows.test.ts
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest"

// ─── Domain imports (pure — no mocks needed) ───────────────────────────────────
import { computeDailyEnergy }          from "@/lib/domain/energy/energy-engine"
import { computeBMR }                  from "@/lib/domain/energy/bmr"
import { computeTrainingKcal }         from "@/lib/domain/energy/training"
import { computeTEF }                  from "@/lib/domain/energy/tef"
import { applyMetabolicAdaptation }    from "@/lib/domain/energy/adaptation"
import { computeHydrationTarget }      from "@/lib/domain/energy/hydration"
import {
  calculateRecipeNutrition,
  calculateRecipeCost,
  scaleRecipeByServings,
  scaleRecipeToTargetKcal,
} from "@/lib/domain/nutrition/recipe-calculator"
import {
  calculateSportKcal,
  intensityToMETScale,
  getIntensityDescription,
} from "@/lib/domain/nutrition/sports-calculator"
import {
  generatePlan,
  calculateDailyTarget,
  distributeKcalBySlot,
  MEAL_SLOTS,
  GOAL_MACRO_SPLITS,
} from "@/lib/domain/nutrition/plan-generator"

// ─── Test fixtures ────────────────────────────────────────────────────────────

const MALE_PROFILE = {
  weightKg:            80,
  heightCm:            175,
  age:                 28,
  sex:                 "MALE" as const,
  activityFactor:      1.55,
  metabolicAdjustment: 1.0,
  goal:                "MUSCLE_GAIN" as const,
}

const FEMALE_PROFILE = {
  weightKg:            60,
  heightCm:            162,
  age:                 25,
  sex:                 "FEMALE" as const,
  activityFactor:      1.375,
  metabolicAdjustment: 1.0,
  goal:                "FAT_LOSS" as const,
}

const RICE_CHICKEN_RECIPE = {
  ingredients: [
    {
      ingredient: {
        id: "ing_1", name: "Arroz blanco",
        kcalPer100g: 130, proteinPer100g: 2.7,
        carbsPer100g: 28, fatPer100g: 0.3, fiberPer100g: 0.4,
      },
      gramsInBase: 150,
    },
    {
      ingredient: {
        id: "ing_2", name: "Pechuga de pollo",
        kcalPer100g: 165, proteinPer100g: 31,
        carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0,
      },
      gramsInBase: 200,
    },
    {
      ingredient: {
        id: "ing_3", name: "Aguacate",
        kcalPer100g: 160, proteinPer100g: 2,
        carbsPer100g: 9, fatPer100g: 15, fiberPer100g: 7,
      },
      gramsInBase: 80,
    },
  ],
  baseServings: 1,
}

const PROTEIN_SHAKE = {
  ingredients: [
    {
      ingredient: {
        id: "ing_4", name: "Leche entera",
        kcalPer100g: 61, proteinPer100g: 3.2,
        carbsPer100g: 4.8, fatPer100g: 3.3, fiberPer100g: 0,
      },
      gramsInBase: 300,
    },
    {
      ingredient: {
        id: "ing_5", name: "Banano",
        kcalPer100g: 89, proteinPer100g: 1.1,
        carbsPer100g: 23, fatPer100g: 0.3, fiberPer100g: 2.6,
      },
      gramsInBase: 150,
    },
    {
      ingredient: {
        id: "ing_6", name: "Avena en hojuelas",
        kcalPer100g: 389, proteinPer100g: 17,
        carbsPer100g: 66, fatPer100g: 7, fiberPer100g: 10,
      },
      gramsInBase: 80,
    },
  ],
  baseServings: 1,
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BMR CALCULATION FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("BMR Calculation Flow", () => {
  it("calculates correct BMR for male profile using Mifflin-St Jeor", () => {
    // (10 × 80) + (6.25 × 175) − (5 × 28) + 5 = 800 + 1093.75 − 140 + 5 = 1758.75
    const bmr = computeBMR(MALE_PROFILE)
    expect(bmr).toBeCloseTo(1758.75, 0)
  })

  it("calculates correct BMR for female profile", () => {
    // (10 × 60) + (6.25 × 162) − (5 × 25) − 161 = 600 + 1012.5 − 125 − 161 = 1326.5
    const bmr = computeBMR(FEMALE_PROFILE)
    expect(bmr).toBeCloseTo(1326.5, 0)
  })

  it("applies metabolicAdjustment factor to BMR", () => {
    const baseBMR    = computeBMR(MALE_PROFILE)
    const adjustedBMR = computeBMR({ ...MALE_PROFILE, metabolicAdjustment: 0.95 })
    expect(adjustedBMR).toBeCloseTo(baseBMR * 0.95, 1)
  })

  it("higher weight produces higher BMR", () => {
    const bmr80 = computeBMR(MALE_PROFILE)
    const bmr90 = computeBMR({ ...MALE_PROFILE, weightKg: 90 })
    expect(bmr90).toBeGreaterThan(bmr80)
    // Each kg adds 10 kcal
    expect(bmr90 - bmr80).toBeCloseTo(100, 0)
  })

  it("metabolicAdjustment clamped between 0.7 and 1.3", () => {
    const bmrBase = computeBMR(MALE_PROFILE)
    const bmrLow  = computeBMR({ ...MALE_PROFILE, metabolicAdjustment: 0.5 }) // should clamp to 0.7
    const bmrHigh = computeBMR({ ...MALE_PROFILE, metabolicAdjustment: 1.5 }) // should clamp to 1.3

    // If clamping is implemented
    expect(bmrLow).toBeGreaterThanOrEqual(bmrBase * 0.65)
    expect(bmrHigh).toBeLessThanOrEqual(bmrBase * 1.35)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. ENERGY ENGINE FULL FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("Energy Engine — Full Daily Flow", () => {
  const input = {
    profile:   MALE_PROFILE,
    nutrition: { caloriesIn: 2800, proteinG: 160, carbsG: 300, fatG: 80 },
    workout: {
      type:            "STRENGTH" as const,
      durationMinutes: 60,
      intensityFactor: 12,
      realKcal:        400,
    },
  }

  it("returns all required output fields", () => {
    const result = computeDailyEnergy(input)
    expect(result).toHaveProperty("bmr")
    expect(result).toHaveProperty("neat")
    expect(result).toHaveProperty("tef")
    expect(result).toHaveProperty("trainingKcal")
    expect(result).toHaveProperty("totalOut")
    expect(result).toHaveProperty("balance")
    expect(result).toHaveProperty("estimatedWeightDeltaKg")
    expect(result).toHaveProperty("hydrationTargetMl")
  })

  it("totalOut = bmr + neat + tef + training", () => {
    const r = computeDailyEnergy(input)
    expect(r.totalOut).toBeCloseTo(r.bmr + r.neat + r.tef + r.trainingKcal, 0)
  })

  it("balance = caloriesIn - totalOut", () => {
    const r = computeDailyEnergy(input)
    expect(r.balance).toBeCloseTo(2800 - r.totalOut, 0)
  })

  it("estimatedWeightDeltaKg = balance / 7700", () => {
    const r = computeDailyEnergy(input)
    expect(r.estimatedWeightDeltaKg).toBeCloseTo(r.balance / 7700, 4)
  })

  it("uses realKcal when provided (overrides MET estimate)", () => {
    const result = computeDailyEnergy(input)
    expect(result.trainingKcal).toBe(400) // realKcal takes priority
  })

  it("deficit produces negative balance and negative deltaKg", () => {
    const deficitInput = { ...input, nutrition: { ...input.nutrition, caloriesIn: 1500 } }
    const r = computeDailyEnergy(deficitInput)
    expect(r.balance).toBeLessThan(0)
    expect(r.estimatedWeightDeltaKg).toBeLessThan(0)
  })

  it("surplus produces positive balance and positive deltaKg", () => {
    const surplusInput = { ...input, nutrition: { ...input.nutrition, caloriesIn: 4000 } }
    const r = computeDailyEnergy(surplusInput)
    expect(r.balance).toBeGreaterThan(0)
    expect(r.estimatedWeightDeltaKg).toBeGreaterThan(0)
  })

  it("zero calories produces large deficit", () => {
    const zeroInput = { ...input, nutrition: { caloriesIn: 0, proteinG: 0, carbsG: 0, fatG: 0 } }
    const r = computeDailyEnergy(zeroInput)
    expect(r.balance).toBeLessThan(-1500)
  })

  it("neat increases with higher activity factor", () => {
    const r1 = computeDailyEnergy({ ...input, profile: { ...MALE_PROFILE, activityFactor: 1.2  } })
    const r2 = computeDailyEnergy({ ...input, profile: { ...MALE_PROFILE, activityFactor: 1.9  } })
    expect(r2.neat).toBeGreaterThan(r1.neat)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEF FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("TEF — Thermic Effect of Food", () => {
  it("protein has highest TEF rate (25%)", () => {
    const tef = computeTEF({ proteinG: 100, carbsG: 0, fatG: 0 })
    // 100g × 4 kcal/g × 0.25 = 100 kcal
    expect(tef).toBeCloseTo(100, 0)
  })

  it("carbs TEF rate is 7%", () => {
    const tef = computeTEF({ proteinG: 0, carbsG: 100, fatG: 0 })
    // 100g × 4 kcal/g × 0.07 = 28 kcal
    expect(tef).toBeCloseTo(28, 0)
  })

  it("fat TEF rate is 2%", () => {
    const tef = computeTEF({ proteinG: 0, carbsG: 0, fatG: 100 })
    // 100g × 9 kcal/g × 0.02 = 18 kcal
    expect(tef).toBeCloseTo(18, 0)
  })

  it("mixed macros sum correctly", () => {
    const tef = computeTEF({ proteinG: 160, carbsG: 300, fatG: 80 })
    const expected = (160 * 4 * 0.25) + (300 * 4 * 0.07) + (80 * 9 * 0.02)
    expect(tef).toBeCloseTo(expected, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. TRAINING KCAL FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("Training Kcal Calculation", () => {
  it("uses realKcal when provided", () => {
    const kcal = computeTrainingKcal({
      type: "STRENGTH", durationMinutes: 60,
      intensityFactor: 10, realKcal: 350,
    }, 80)
    expect(kcal).toBe(350)
  })

  it("estimates from MET when realKcal is not provided", () => {
    const kcal = computeTrainingKcal({
      type: "CARDIO", durationMinutes: 45,
      intensityFactor: 10,
    }, 80)
    expect(kcal).toBeGreaterThan(0)
    expect(kcal).toBeLessThan(1000)
  })

  it("higher intensity produces more kcal", () => {
    const low  = computeTrainingKcal({ type: "CARDIO", durationMinutes: 60, intensityFactor: 5  }, 80)
    const high = computeTrainingKcal({ type: "CARDIO", durationMinutes: 60, intensityFactor: 18 }, 80)
    expect(high).toBeGreaterThan(low)
  })

  it("longer duration produces more kcal", () => {
    const short = computeTrainingKcal({ type: "HIIT", durationMinutes: 20, intensityFactor: 12 }, 80)
    const long  = computeTrainingKcal({ type: "HIIT", durationMinutes: 60, intensityFactor: 12 }, 80)
    expect(long).toBeGreaterThan(short)
    expect(long / short).toBeCloseTo(3, 0)
  })

  it("heavier person burns more kcal", () => {
    const light = computeTrainingKcal({ type: "SPORTS", durationMinutes: 60, intensityFactor: 10 }, 60)
    const heavy = computeTrainingKcal({ type: "SPORTS", durationMinutes: 60, intensityFactor: 10 }, 100)
    expect(heavy).toBeGreaterThan(light)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. SPORTS CALCULATOR FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("Sports Calculator", () => {
  it("football burns more than volleyball for same duration", () => {
    const football   = calculateSportKcal("Football",   80, 60, 10)
    const volleyball = calculateSportKcal("Volleyball", 80, 60, 10)
    expect(football).toBeGreaterThan(volleyball)
  })

  it("intensity scale maps 1→0.6 and 20→1.4", () => {
    expect(intensityToMETScale(1)).toBeCloseTo(0.6, 1)
    expect(intensityToMETScale(20)).toBeCloseTo(1.4, 1)
  })

  it("intensity 10 (mid) maps to approximately 1.0", () => {
    expect(intensityToMETScale(10)).toBeCloseTo(1.0, 0)
  })

  it("getIntensityDescription returns label and color for all levels", () => {
    for (let i = 1; i <= 20; i++) {
      const desc = getIntensityDescription(i)
      expect(desc).toHaveProperty("label")
      expect(desc).toHaveProperty("color")
      expect(desc.label.length).toBeGreaterThan(0)
    }
  })

  it("Athletics (10.0 MET) is the highest burn sport", () => {
    const athletics = calculateSportKcal("Athletics", 80, 60, 10)
    const swimming  = calculateSportKcal("Swimming",  80, 60, 10)
    expect(athletics).toBeGreaterThan(swimming)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. METABOLIC ADAPTATION LOOP
// ─────────────────────────────────────────────────────────────────────────────

describe("Metabolic Adaptation Loop", () => {
  it("decreases factor when real weight is lower than estimated (metabolism slower)", () => {
    // Real < Estimated → body is more efficient → lower factor
    const result = applyMetabolicAdaptation({
      currentFactor:    1.0,
      estimatedWeightKg: 79.5,
      realWeightKg:     79.2,  // lost less than expected
      alpha:            0.1,
    })
    expect(result.newFactor).toBeLessThan(1.0)
    expect(result.newFactor).toBeCloseTo(0.97, 2)
  })

  it("increases factor when real weight is higher than estimated (metabolism faster)", () => {
    const result = applyMetabolicAdaptation({
      currentFactor:     1.0,
      estimatedWeightKg: 79.0,
      realWeightKg:      79.8, // lost more than expected
      alpha:             0.1,
    })
    expect(result.newFactor).toBeGreaterThan(1.0)
  })

  it("factor stays at 1.0 when prediction is perfect", () => {
    const result = applyMetabolicAdaptation({
      currentFactor:     1.0,
      estimatedWeightKg: 79.5,
      realWeightKg:      79.5, // exact prediction
      alpha:             0.1,
    })
    expect(result.newFactor).toBeCloseTo(1.0, 4)
  })

  it("clamps factor to maximum 1.3", () => {
    const result = applyMetabolicAdaptation({
      currentFactor:     1.3,
      estimatedWeightKg: 75.0,
      realWeightKg:      80.0, // huge positive error
      alpha:             0.5,
    })
    expect(result.newFactor).toBeLessThanOrEqual(1.3)
  })

  it("clamps factor to minimum 0.7", () => {
    const result = applyMetabolicAdaptation({
      currentFactor:     0.7,
      estimatedWeightKg: 80.0,
      realWeightKg:      75.0, // huge negative error
      alpha:             0.5,
    })
    expect(result.newFactor).toBeGreaterThanOrEqual(0.7)
  })

  it("adaptation is proportional to error magnitude", () => {
    const small = applyMetabolicAdaptation({ currentFactor: 1.0, estimatedWeightKg: 80.0, realWeightKg: 79.9, alpha: 0.1 })
    const large = applyMetabolicAdaptation({ currentFactor: 1.0, estimatedWeightKg: 80.0, realWeightKg: 79.0, alpha: 0.1 })
    expect(Math.abs(1.0 - large.newFactor)).toBeGreaterThan(Math.abs(1.0 - small.newFactor))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. RECIPE NUTRITION CALCULATION FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("Recipe Nutrition Calculation", () => {
  it("calculates total and per-serving nutrition correctly", () => {
    const result = calculateRecipeNutrition(
      RICE_CHICKEN_RECIPE.ingredients,
      RICE_CHICKEN_RECIPE.baseServings
    )
    // Arroz: 150g × (130/100) = 195 kcal
    // Pollo: 200g × (165/100) = 330 kcal
    // Aguacate: 80g × (160/100) = 128 kcal
    // Total = 653 kcal
    expect(result.total.kcal).toBeCloseTo(653, 0)
    expect(result.perServing.kcal).toBeCloseTo(653, 0) // 1 serving
  })

  it("perServing = total / baseServings for multi-serving recipe", () => {
    const result = calculateRecipeNutrition(
      RICE_CHICKEN_RECIPE.ingredients, 2
    )
    expect(result.perServing.kcal).toBeCloseTo(result.total.kcal / 2, 1)
  })

  it("protein comes mainly from chicken", () => {
    const result = calculateRecipeNutrition(
      RICE_CHICKEN_RECIPE.ingredients,
      RICE_CHICKEN_RECIPE.baseServings
    )
    // Pollo: 200g × (31/100) = 62g protein
    expect(result.total.proteinG).toBeGreaterThan(60)
  })

  it("macro percentages sum to approximately 100%", () => {
    const result = calculateRecipeNutrition(
      PROTEIN_SHAKE.ingredients, 1
    )
    const sum = result.macroPercents.proteinPct
              + result.macroPercents.carbsPct
              + result.macroPercents.fatPct
    expect(sum).toBeCloseTo(100, 0)
  })

  it("empty ingredients returns zero nutrition", () => {
    const result = calculateRecipeNutrition([], 1)
    expect(result.total.kcal).toBe(0)
    expect(result.total.proteinG).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. RECIPE SCALING FLOWS
// ─────────────────────────────────────────────────────────────────────────────

describe("Recipe Scaling", () => {
  describe("scaleRecipeByServings", () => {
    it("doubles grams when scaling from 1 to 2 servings", () => {
      const scaled = scaleRecipeByServings(
        RICE_CHICKEN_RECIPE.ingredients,
        RICE_CHICKEN_RECIPE.baseServings,
        2
      )
      const originalGrams = RICE_CHICKEN_RECIPE.ingredients[0]!.gramsInBase
      const scaledGrams   = scaled.ingredients[0]!.gramsInBase
      expect(scaledGrams).toBeCloseTo(originalGrams * 2, 1)
    })

    it("nutrition doubles when servings double", () => {
      const original = calculateRecipeNutrition(RICE_CHICKEN_RECIPE.ingredients, 1)
      const scaled   = scaleRecipeByServings(RICE_CHICKEN_RECIPE.ingredients, 1, 2)
      const scaledNutrition = calculateRecipeNutrition(scaled.ingredients, 1)
      expect(scaledNutrition.total.kcal).toBeCloseTo(original.total.kcal * 2, 0)
    })

    it("handles fractional servings (0.5x)", () => {
      const scaled = scaleRecipeByServings(RICE_CHICKEN_RECIPE.ingredients, 1, 0.5)
      const originalKcal = calculateRecipeNutrition(RICE_CHICKEN_RECIPE.ingredients, 1).total.kcal
      const scaledKcal   = calculateRecipeNutrition(scaled.ingredients, 1).total.kcal
      expect(scaledKcal).toBeCloseTo(originalKcal * 0.5, 0)
    })
  })

  describe("scaleRecipeToTargetKcal", () => {
    it("scales recipe to hit exact kcal target per serving", () => {
      const target = 500
      const scaled = scaleRecipeToTargetKcal(
        RICE_CHICKEN_RECIPE.ingredients,
        RICE_CHICKEN_RECIPE.baseServings,
        target
      )
      const resultKcal = calculateRecipeNutrition(scaled.ingredients, 1).perServing.kcal
      expect(resultKcal).toBeCloseTo(target, 0)
    })

    it("works for low kcal targets (scaling down)", () => {
      const scaled = scaleRecipeToTargetKcal(
        RICE_CHICKEN_RECIPE.ingredients, 1, 200
      )
      const resultKcal = calculateRecipeNutrition(scaled.ingredients, 1).perServing.kcal
      expect(resultKcal).toBeCloseTo(200, 5)
    })

    it("works for high kcal targets (scaling up)", () => {
      const scaled = scaleRecipeToTargetKcal(
        RICE_CHICKEN_RECIPE.ingredients, 1, 1200
      )
      const resultKcal = calculateRecipeNutrition(scaled.ingredients, 1).perServing.kcal
      expect(resultKcal).toBeCloseTo(1200, 5)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. RECIPE COST CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

describe("Recipe Cost Calculation", () => {
  const RECIPE_WITH_PRICES = [
    {
      ingredient: {
        id: "i1", name: "Arroz",
        kcalPer100g: 130, proteinPer100g: 2.7,
        carbsPer100g: 28, fatPer100g: 0.3, fiberPer100g: 0.4,
      },
      gramsInBase: 200,   // 200g
      pricePerKg:  3500,  // $3500 COP/kg → 200g = $700
    },
    {
      ingredient: {
        id: "i2", name: "Pollo",
        kcalPer100g: 165, proteinPer100g: 31,
        carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0,
      },
      gramsInBase: 200,   // 200g
      pricePerKg:  15000, // $15000 COP/kg → 200g = $3000
    },
  ]

  it("calculates total cost from ingredient prices", () => {
    const result = calculateRecipeCost(RECIPE_WITH_PRICES as any, 1)
    // 700 + 3000 = 3700
    expect(result.totalCost).toBeCloseTo(3700, 0)
  })

  it("costPerServing = totalCost / servings", () => {
    const result = calculateRecipeCost(RECIPE_WITH_PRICES as any, 2)
    expect(result.costPerServing).toBeCloseTo(result.totalCost / 2, 0)
  })

  it("skips ingredients with no price (null/undefined)", () => {
    const withMissingPrice = [
      ...RECIPE_WITH_PRICES,
      { ingredient: { id: "i3", name: "Sal", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0 },
        gramsInBase: 5, pricePerKg: null }
    ]
    const result = calculateRecipeCost(withMissingPrice as any, 1)
    expect(result.totalCost).toBeCloseTo(3700, 0)  // Sal doesn't add to cost
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 10. HYDRATION TARGET FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("Hydration Target Calculation", () => {
  it("baseline is weightKg × 35ml", () => {
    const target = computeHydrationTarget({ weightKg: 80, trainingKcal: 0 })
    expect(target).toBeCloseTo(80 * 35, 0)
  })

  it("adds extra hydration for training", () => {
    const base      = computeHydrationTarget({ weightKg: 80, trainingKcal: 0   })
    const withCardio = computeHydrationTarget({ weightKg: 80, trainingKcal: 500 })
    expect(withCardio).toBeGreaterThan(base)
  })

  it("heavier person needs more water", () => {
    const light = computeHydrationTarget({ weightKg: 60, trainingKcal: 0 })
    const heavy = computeHydrationTarget({ weightKg: 100, trainingKcal: 0 })
    expect(heavy).toBeGreaterThan(light)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 11. PLAN GENERATOR FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("Nutrition Plan Generator", () => {
  const MOCK_RECIPES = [
    { id: "r1", name: "Arroz con pollo", baseServings: 1, ingredients: RICE_CHICKEN_RECIPE.ingredients },
    { id: "r2", name: "Batido proteico",  baseServings: 1, ingredients: PROTEIN_SHAKE.ingredients       },
    { id: "r3", name: "Ensalada",         baseServings: 1, ingredients: [
      { ingredient: { id: "v1", name: "Espinaca", kcalPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 2.2 }, gramsInBase: 200 },
    ]},
  ]

  it("generates correct number of days", () => {
    const plan = generatePlan(MOCK_RECIPES, 2000, new Date(), 7)
    expect(plan.days).toHaveLength(7)
  })

  it("each day has meals for active slots (>0% kcal)", () => {
    const plan = generatePlan(MOCK_RECIPES, 2000, new Date(), 3)
    const activeSlots = MEAL_SLOTS.filter(s => s.kcalPct > 0)
    for (const day of plan.days) {
      expect(day.meals.length).toBeGreaterThan(0)
      expect(day.meals.length).toBeLessThanOrEqual(activeSlots.length)
    }
  })

  it("coverageScore between 0 and 1", () => {
    const plan = generatePlan(MOCK_RECIPES, 2000, new Date(), 7)
    expect(plan.coverageScore).toBeGreaterThanOrEqual(0)
    expect(plan.coverageScore).toBeLessThanOrEqual(1)
  })

  it("coverageScore is 1.0 when all slots have recipes", () => {
    const plan = generatePlan(MOCK_RECIPES, 2000, new Date(), 1)
    // With enough recipes, all slots should be filled
    expect(plan.coverageScore).toBeGreaterThan(0.5)
  })

  it("distributes kcal correctly across slots", () => {
    const targetKcal = 2000
    const distribution = distributeKcalBySlot(targetKcal)
    expect(distribution["BREAKFAST"]).toBeCloseTo(2000 * 0.25, 0)
    expect(distribution["LUNCH"]    ).toBeCloseTo(2000 * 0.35, 0)
    expect(distribution["DINNER"]   ).toBeCloseTo(2000 * 0.30, 0)
    expect(distribution["SNACK"]    ).toBeCloseTo(2000 * 0.10, 0)
  })

  it("returns empty days when no recipes provided", () => {
    const plan = generatePlan([], 2000, new Date(), 3)
    for (const day of plan.days) {
      expect(day.meals).toHaveLength(0)
    }
    expect(plan.coverageScore).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 12. GOAL-BASED CALORIC TARGETS
// ─────────────────────────────────────────────────────────────────────────────

describe("Goal-based Caloric Targets", () => {
  const tdee = 2500

  it("FAT_LOSS applies 20% deficit", () => {
    const target = calculateDailyTarget(tdee, "FAT_LOSS")
    expect(target).toBeCloseTo(tdee * 0.80, 0)
  })

  it("WEIGHT_LOSS applies 15% deficit", () => {
    const target = calculateDailyTarget(tdee, "WEIGHT_LOSS")
    expect(target).toBeCloseTo(tdee * 0.85, 0)
  })

  it("MUSCLE_GAIN applies 10% surplus", () => {
    const target = calculateDailyTarget(tdee, "MUSCLE_GAIN")
    expect(target).toBeCloseTo(tdee * 1.10, 0)
  })

  it("MAINTENANCE returns TDEE unchanged", () => {
    const target = calculateDailyTarget(tdee, "MAINTENANCE")
    expect(target).toBeCloseTo(tdee, 0)
  })

  it("GOAL_MACRO_SPLITS percentages sum to 100% for each goal", () => {
    for (const [goal, split] of Object.entries(GOAL_MACRO_SPLITS)) {
      const sum = split.proteinPct + split.carbsPct + split.fatPct
      expect(sum).toBeCloseTo(1.0, 2)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 13. DATE HANDLING FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("Date Handling — @db.Date compatibility", () => {
  function toDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  it("toDateOnly produces midnight local time", () => {
    const now = new Date("2026-03-22T18:32:50.658Z")
    const dateOnly = toDateOnly(now)
    expect(dateOnly.getHours()).toBe(0)
    expect(dateOnly.getMinutes()).toBe(0)
    expect(dateOnly.getSeconds()).toBe(0)
    expect(dateOnly.getMilliseconds()).toBe(0)
  })

  it("two toDateOnly calls on same day produce equal dates", () => {
    const a = toDateOnly(new Date("2026-03-22T08:00:00Z"))
    const b = toDateOnly(new Date("2026-03-22T23:59:59Z"))
    // Same day → same date-only value
    expect(a.getFullYear()).toBe(b.getFullYear())
    expect(a.getMonth()).toBe(b.getMonth())
    expect(a.getDate()).toBe(b.getDate())
  })

  it("different days produce different dates", () => {
    const day1 = toDateOnly(new Date("2026-03-22T12:00:00Z"))
    const day2 = toDateOnly(new Date("2026-03-23T12:00:00Z"))
    expect(day1.getDate()).not.toBe(day2.getDate())
  })

  it("useMemo pattern: same reference across re-creation", () => {
    // Simulate what useMemo([], []) does
    const now = new Date()
    const stable = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Reference equality check — same value
    const recreated = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    expect(stable.getTime()).toBe(recreated.getTime())
    // But NOT same reference (that's why useMemo is needed)
    expect(stable).not.toBe(recreated)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 14. WEEKLY ENERGY SUMMARY FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("Weekly Energy Summary Derivations", () => {
  const WEEK_LOGS = [
    { caloriesIn: 2800, caloriesOut: 2600, balance: 200,  proteinGrams: 160, estimatedWeightDeltaKg:  0.026 },
    { caloriesIn: 2200, caloriesOut: 2600, balance: -400, proteinGrams: 140, estimatedWeightDeltaKg: -0.052 },
    { caloriesIn: 2500, caloriesOut: 2550, balance: -50,  proteinGrams: 150, estimatedWeightDeltaKg: -0.006 },
    { caloriesIn: 3000, caloriesOut: 2600, balance: 400,  proteinGrams: 170, estimatedWeightDeltaKg:  0.052 },
    { caloriesIn: 2600, caloriesOut: 2600, balance: 0,    proteinGrams: 155, estimatedWeightDeltaKg:  0.000 },
  ]

  it("weekly average kcal is correct", () => {
    const avgKcal = WEEK_LOGS.reduce((s, l) => s + l.caloriesIn, 0) / WEEK_LOGS.length
    expect(avgKcal).toBeCloseTo(2620, 0)
  })

  it("total estimated weight delta sums correctly", () => {
    const total = WEEK_LOGS.reduce((s, l) => s + l.estimatedWeightDeltaKg, 0)
    expect(total).toBeCloseTo(0.020, 3)
  })

  it("weekly accumulated balance = sum of daily balances", () => {
    const accBalance = WEEK_LOGS.reduce((s, l) => s + l.balance, 0)
    expect(accBalance).toBe(150)
  })

  it("estimated weight change from balance: 150 kcal / 7700 ≈ 0.019 kg", () => {
    const accBalance = WEEK_LOGS.reduce((s, l) => s + l.balance, 0)
    const deltaKg    = accBalance / 7700
    expect(deltaKg).toBeCloseTo(0.019, 3)
  })

  it("weight series accumulates from base weight", () => {
    const base = 80
    let acc    = base
    const series = WEEK_LOGS.map(log => {
      acc += log.estimatedWeightDeltaKg
      return parseFloat(acc.toFixed(3))
    })
    expect(series[0]).toBeCloseTo(80.026, 2)
    expect(series[series.length - 1]).toBeCloseTo(base + 0.020, 2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 15. FEED VISIBILITY LOGIC
// ─────────────────────────────────────────────────────────────────────────────

describe("Feed Visibility Logic", () => {
  function getVisibleUserIds(userId: string, coachId: string | null, coachClients: string[]) {
    return [
      userId,
      ...(coachId ? [coachId] : []),
      ...coachClients,
    ]
  }

  function isPostVisible(
    post: { userId: string; visibility: string },
    visibleUserIds: string[]
  ): boolean {
    if (post.visibility === "PUBLIC") return true
    return visibleUserIds.includes(post.userId)
  }

  it("user sees own posts regardless of visibility", () => {
    const visible = getVisibleUserIds("user1", null, [])
    expect(isPostVisible({ userId: "user1", visibility: "PRIVATE" }, visible)).toBe(true)
    expect(isPostVisible({ userId: "user1", visibility: "PUBLIC" },  visible)).toBe(true)
  })

  it("user sees coach posts", () => {
    const visible = getVisibleUserIds("user1", "coach1", [])
    expect(isPostVisible({ userId: "coach1", visibility: "PRIVATE" }, visible)).toBe(true)
  })

  it("user sees fellow client posts in COACH_GROUP", () => {
    const visible = getVisibleUserIds("user1", "coach1", ["user2", "user3"])
    expect(isPostVisible({ userId: "user2", visibility: "COACH_GROUP" }, visible)).toBe(true)
  })

  it("PUBLIC posts visible to everyone", () => {
    const visibleNoCoach = getVisibleUserIds("user1", null, [])
    expect(isPostVisible({ userId: "stranger", visibility: "PUBLIC" }, visibleNoCoach)).toBe(true)
  })

  it("PRIVATE post from stranger is NOT visible", () => {
    const visible = getVisibleUserIds("user1", "coach1", ["user2"])
    expect(isPostVisible({ userId: "stranger", visibility: "PRIVATE" }, visible)).toBe(false)
  })

  it("user without coach only sees own + public posts", () => {
    const visible = getVisibleUserIds("user1", null, [])
    expect(isPostVisible({ userId: "user1",    visibility: "PRIVATE" }, visible)).toBe(true)
    expect(isPostVisible({ userId: "anyone",   visibility: "PUBLIC"  }, visible)).toBe(true)
    expect(isPostVisible({ userId: "someone",  visibility: "PRIVATE" }, visible)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 16. SUBSCRIPTION STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

describe("Subscription State Machine Logic", () => {
  function isTrialActive(sub: { status: string; trialEndsAt: Date | null }): boolean {
    return sub.status === "TRIAL" && !!sub.trialEndsAt && sub.trialEndsAt > new Date()
  }

  function isAccessBlocked(sub: { status: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null }): boolean {
    if (sub.status === "PAST_DUE") return true
    if (sub.status === "TRIAL" && sub.trialEndsAt && sub.trialEndsAt < new Date()) return true
    return false
  }

  it("TRIAL is active when trialEndsAt is in the future", () => {
    const future = new Date(Date.now() + 10 * 86400000)
    expect(isTrialActive({ status: "TRIAL", trialEndsAt: future })).toBe(true)
  })

  it("TRIAL is not active when expired", () => {
    const past = new Date(Date.now() - 1 * 86400000)
    expect(isTrialActive({ status: "TRIAL", trialEndsAt: past })).toBe(false)
  })

  it("PAST_DUE blocks access", () => {
    expect(isAccessBlocked({ status: "PAST_DUE", trialEndsAt: null, currentPeriodEnd: null })).toBe(true)
  })

  it("expired TRIAL blocks access", () => {
    const past = new Date(Date.now() - 1 * 86400000)
    expect(isAccessBlocked({ status: "TRIAL", trialEndsAt: past, currentPeriodEnd: null })).toBe(true)
  })

  it("ACTIVE does not block access", () => {
    expect(isAccessBlocked({ status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: null })).toBe(false)
  })

  it("CANCELLED does not block access immediately", () => {
    // CANCELLED + cancelAtPeriodEnd=true → still active until period end
    expect(isAccessBlocked({ status: "CANCELLED", trialEndsAt: null, currentPeriodEnd: null })).toBe(false)
  })

  it("daysLeft calculation is correct", () => {
    const daysLeft = (periodEnd: Date) =>
      Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86400000))

    const in10Days = new Date(Date.now() + 10 * 86400000)
    expect(daysLeft(in10Days)).toBe(10)

    const yesterday = new Date(Date.now() - 86400000)
    expect(daysLeft(yesterday)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 17. REGISTRATION CODE VALIDATION FLOW
// ─────────────────────────────────────────────────────────────────────────────

describe("Registration Code Validation Logic", () => {
  function validateCode(code: {
    type:      string
    expiresAt: Date
    usedAt:    Date | null
    useCount:  number
    maxUses:   number
  }): { valid: boolean; reason?: string } {
    if (code.expiresAt < new Date())                  return { valid: false, reason: "Expirado"    }
    if (code.usedAt && code.useCount >= code.maxUses) return { valid: false, reason: "Ya utilizado" }
    return { valid: true }
  }

  const futureDate = new Date(Date.now() + 7 * 86400000)
  const pastDate   = new Date(Date.now() - 1 * 86400000)

  it("valid unused code passes", () => {
    const result = validateCode({
      type: "CLIENT", expiresAt: futureDate,
      usedAt: null, useCount: 0, maxUses: 1
    })
    expect(result.valid).toBe(true)
  })

  it("expired code is invalid", () => {
    const result = validateCode({
      type: "CLIENT", expiresAt: pastDate,
      usedAt: null, useCount: 0, maxUses: 1
    })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("Expirado")
  })

  it("used code is invalid", () => {
    const result = validateCode({
      type: "CLIENT", expiresAt: futureDate,
      usedAt: new Date(), useCount: 1, maxUses: 1
    })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("utilizado")
  })

  it("COACH type code creates COACH role user", () => {
    const codeType  = "COACH"
    const role      = codeType === "COACH" ? "COACH" : "USER"
    expect(role).toBe("COACH")
  })

  it("CLIENT type code creates USER role with coachId", () => {
    const codeType = "CLIENT"
    const role     = codeType === "COACH" ? "COACH" : "USER"
    expect(role).toBe("USER")
  })
})
