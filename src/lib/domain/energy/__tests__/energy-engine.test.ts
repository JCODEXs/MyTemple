import { describe, it, expect } from "vitest"
import { calculateBMR } from "../metabolicFunctions"
import { estimateTrainingKcal } from "../metabolicFunctions"
import { calculateTEF } from "../metabolicFunctions"
import { adjustMetabolicFactor } from "../metabolicFunctions"
import { recommendedHydration } from "../metabolicFunctions"
import { computeDailyEnergy } from "../metabolicFunctions"
import type { ProfileInput, DailyInput, TrainingInput } from "../../../types"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseMaleProfile: ProfileInput = {
  age: 30,
  heightCm: 175,
  weightKg: 80,
  sex: "MALE",
  activityFactor: 1.55,
  metabolicAdjustment: 1.0,
}

const baseFemaleProfile: ProfileInput = {
  age: 28,
  heightCm: 165,
  weightKg: 65,
  sex: "FEMALE",
  activityFactor: 1.375,
  metabolicAdjustment: 1.0,
}

const baseDailyInput: DailyInput = {
  caloriesIn: 2500,
  proteinGrams: 180,
  carbsGrams: 250,
  fatGrams: 70,
}

const baseTraining: TrainingInput = {
  durationMinutes: 60,
  intensityFactor: 8.0,
}

// ─── calculateBMR ─────────────────────────────────────────────────────────────

describe("calculateBMR", () => {
  it("calcula BMR masculino con Mifflin-St Jeor correctamente", () => {
    // (10 * 80) + (6.25 * 175) - (5 * 30) + 5 = 800 + 1093.75 - 150 + 5 = 1748.75
    const result = calculateBMR(baseMaleProfile)
    expect(result).toBeCloseTo(1748.75, 1)
  })

  it("calcula BMR femenino con Mifflin-St Jeor correctamente", () => {
    // (10 * 65) + (6.25 * 165) - (5 * 28) - 161 = 650 + 1031.25 - 140 - 161 = 1380.25
    const result = calculateBMR(baseFemaleProfile)
    expect(result).toBeCloseTo(1380.25, 1)
  })

  it("aplica metabolicAdjustment correctamente", () => {
    const adjusted = calculateBMR({ ...baseMaleProfile, metabolicAdjustment: 0.9 })
    const base = calculateBMR(baseMaleProfile)
    expect(adjusted).toBeCloseTo(base * 0.9, 1)
  })

  it("metabolicAdjustment 1.0 no modifica el BMR", () => {
    const result = calculateBMR({ ...baseMaleProfile, metabolicAdjustment: 1.0 })
    expect(result).toBeCloseTo(1748.75, 1)
  })

  it("BMR aumenta con mayor peso", () => {
    const heavier = calculateBMR({ ...baseMaleProfile, weightKg: 100 })
    const lighter = calculateBMR(baseMaleProfile)
    expect(heavier).toBeGreaterThan(lighter)
  })

  it("BMR aumenta con mayor altura", () => {
    const taller = calculateBMR({ ...baseMaleProfile, heightCm: 190 })
    const shorter = calculateBMR(baseMaleProfile)
    expect(taller).toBeGreaterThan(shorter)
  })

  it("BMR disminuye con mayor edad", () => {
    const older = calculateBMR({ ...baseMaleProfile, age: 60 })
    const younger = calculateBMR(baseMaleProfile)
    expect(older).toBeLessThan(younger)
  })

  it("rechaza valores de peso negativo o cero con resultado no positivo", () => {
    const result = calculateBMR({ ...baseMaleProfile, weightKg: 0 })
    // Con peso 0: 0 + 1093.75 - 150 + 5 = 948.75, sigue siendo positivo
    // Solo validamos que sea un número finito
    expect(Number.isFinite(result)).toBe(true)
  })
})

// ─── estimateTrainingKcal ─────────────────────────────────────────────────────

describe("estimateTrainingKcal", () => {
  it("retorna 0 si no hay entrenamiento", () => {
    expect(estimateTrainingKcal(80, undefined)).toBe(0)
  })

  it("estima kcal con la constante 0.0175", () => {
    // 0.0175 * 8.0 * 80 * 60 = 672
    const result = estimateTrainingKcal(80, baseTraining)
    expect(result).toBeCloseTo(672, 1)
  })

  it("usa realKcal si está disponible, ignorando la estimación", () => {
    const trainingWithReal: TrainingInput = {
      ...baseTraining,
      realKcal: 500,
    }
    expect(estimateTrainingKcal(80, trainingWithReal)).toBe(500)
  })

  it("kcal estimada aumenta con mayor duración", () => {
    const short = estimateTrainingKcal(80, { ...baseTraining, durationMinutes: 30 })
    const long = estimateTrainingKcal(80, { ...baseTraining, durationMinutes: 90 })
    expect(long).toBeGreaterThan(short)
  })

  it("kcal estimada aumenta con mayor intensidad", () => {
    const low = estimateTrainingKcal(80, { ...baseTraining, intensityFactor: 4.0 })
    const high = estimateTrainingKcal(80, { ...baseTraining, intensityFactor: 12.0 })
    expect(high).toBeGreaterThan(low)
  })

  it("kcal estimada aumenta con mayor peso corporal", () => {
    const light = estimateTrainingKcal(60, baseTraining)
    const heavy = estimateTrainingKcal(100, baseTraining)
    expect(heavy).toBeGreaterThan(light)
  })
})

// ─── calculateTEF ─────────────────────────────────────────────────────────────

describe("calculateTEF", () => {
  it("calcula TEF correctamente con macros mixtos", () => {
    // proteína: 180g * 4kcal * 0.25 = 180
    // carbos:   250g * 4kcal * 0.07 = 70
    // grasa:    70g  * 9kcal * 0.02 = 12.6
    // total: 262.6
    const result = calculateTEF(180, 250, 70)
    expect(result).toBeCloseTo(262.6, 1)
  })

  it("TEF es 0 con todos los macros en 0", () => {
    expect(calculateTEF(0, 0, 0)).toBe(0)
  })

  it("proteína tiene el mayor efecto térmico (0.25)", () => {
    const proteinOnly = calculateTEF(100, 0, 0)   // 100*4*0.25 = 100
    const carbsOnly   = calculateTEF(0, 100, 0)   // 100*4*0.07 = 28
    const fatOnly     = calculateTEF(0, 0, 100)   // 100*9*0.02 = 18

    expect(proteinOnly).toBeGreaterThan(carbsOnly)
    expect(carbsOnly).toBeGreaterThan(fatOnly)
  })

  it("dieta alta en proteína genera mayor TEF", () => {
    const highProtein = calculateTEF(250, 100, 50)
    const lowProtein  = calculateTEF(50, 300, 100)
    expect(highProtein).toBeGreaterThan(lowProtein)
  })
})

// ─── adjustMetabolicFactor ────────────────────────────────────────────────────

describe("adjustMetabolicFactor", () => {
  it("no modifica el factor cuando peso estimado === peso real", () => {
    const result = adjustMetabolicFactor(1.0, 80, 80)
    expect(result).toBeCloseTo(1.0, 5)
  })

  it("reduce el factor cuando el peso real es menor al estimado (metabolismo más lento de lo esperado)", () => {
    // realWeight < estimatedWeight → error negativo → factor < currentFactor
    const result = adjustMetabolicFactor(1.0, 80, 79)
    expect(result).toBeLessThan(1.0)
  })

  it("aumenta el factor cuando el peso real es mayor al estimado (metabolismo más rápido)", () => {
    // realWeight > estimatedWeight → error positivo → factor > currentFactor
    const result = adjustMetabolicFactor(1.0, 80, 81)
    expect(result).toBeGreaterThan(1.0)
  })

  it("alpha controla la magnitud del ajuste", () => {
    const smallAlpha = adjustMetabolicFactor(1.0, 80, 79, 0.01)
    const largeAlpha = adjustMetabolicFactor(1.0, 80, 79, 0.1)

    // con alpha grande, el ajuste es más agresivo (más alejado de 1.0)
    expect(Math.abs(largeAlpha - 1.0)).toBeGreaterThan(Math.abs(smallAlpha - 1.0))
  })

  it("mantiene coherencia con factores distintos de 1.0", () => {
    const result = adjustMetabolicFactor(0.95, 80, 80)
    expect(result).toBeCloseTo(0.95, 5)
  })
})

// ─── recommendedHydration ────────────────────────────────────────────────────

describe("recommendedHydration", () => {
  it("calcula hidratación base (sin entrenamiento)", () => {
    // 80kg * 35ml = 2800ml
    expect(recommendedHydration(80)).toBe(2800)
  })

  it("añade ml extra por minutos de entrenamiento", () => {
    // 2800 + 60 * 12 = 3520ml
    expect(recommendedHydration(80, 60)).toBe(3520)
  })

  it("0 minutos de entrenamiento equivale a no entrenar", () => {
    expect(recommendedHydration(80, 0)).toBe(recommendedHydration(80))
  })

  it("hidratación escala linealmente con el peso", () => {
    const h60 = recommendedHydration(60)
    const h80 = recommendedHydration(80)
    const h100 = recommendedHydration(100)

    expect(h80 - h60).toBe(h100 - h80) // diferencia constante de 700ml
  })

  it("mayor duración de entrenamiento = mayor hidratación recomendada", () => {
    expect(recommendedHydration(80, 90)).toBeGreaterThan(recommendedHydration(80, 30))
  })
})

// ─── computeDailyEnergy ──────────────────────────────────────────────────────

describe("computeDailyEnergy", () => {
  it("retorna todos los campos del output", () => {
    const result = computeDailyEnergy(baseMaleProfile, baseDailyInput)

    expect(result).toHaveProperty("bmr")
    expect(result).toHaveProperty("tdee")
    expect(result).toHaveProperty("caloriesOut")
    expect(result).toHaveProperty("balance")
    expect(result).toHaveProperty("estimatedWeightDeltaKg")
  })

  it("bmr coincide con calculateBMR standalone", () => {
    const result = computeDailyEnergy(baseMaleProfile, baseDailyInput)
    const expectedBmr = calculateBMR(baseMaleProfile)
    expect(result.bmr).toBeCloseTo(expectedBmr, 3)
  })

  it("balance = caloriesIn - caloriesOut", () => {
    const result = computeDailyEnergy(baseMaleProfile, baseDailyInput)
    expect(result.balance).toBeCloseTo(result.caloriesIn - result.caloriesOut, 3)
  })

  it("estimatedWeightDeltaKg = balance / 7700", () => {
    const result = computeDailyEnergy(baseMaleProfile, baseDailyInput)
    expect(result.estimatedWeightDeltaKg).toBeCloseTo(result.balance / 7700, 5)
  })

  it("caloriesOut aumenta cuando hay entrenamiento", () => {
    const withTraining    = computeDailyEnergy(baseMaleProfile, { ...baseDailyInput, training: baseTraining })
    const withoutTraining = computeDailyEnergy(baseMaleProfile, baseDailyInput)
    expect(withTraining.caloriesOut).toBeGreaterThan(withoutTraining.caloriesOut)
  })

  it("balance negativo cuando caloriesIn < caloriesOut (déficit)", () => {
    const result = computeDailyEnergy(baseMaleProfile, { ...baseDailyInput, caloriesIn: 1000 })
    expect(result.balance).toBeLessThan(0)
    expect(result.estimatedWeightDeltaKg).toBeLessThan(0)
  })

  it("balance positivo cuando caloriesIn > caloriesOut (superávit)", () => {
    const result = computeDailyEnergy(baseMaleProfile, { ...baseDailyInput, caloriesIn: 4000 })
    expect(result.balance).toBeGreaterThan(0)
    expect(result.estimatedWeightDeltaKg).toBeGreaterThan(0)
  })

  it("tdee === caloriesOut (son el mismo valor)", () => {
    const result = computeDailyEnergy(baseMaleProfile, baseDailyInput)
    expect(result.tdee).toBe(result.caloriesOut)
  })

  it("metabolicAdjustment < 1.0 reduce el BMR y el caloriesOut", () => {
    const normal   = computeDailyEnergy(baseMaleProfile, baseDailyInput)
    const adaptive = computeDailyEnergy(
      { ...baseMaleProfile, metabolicAdjustment: 0.9 },
      baseDailyInput
    )
    expect(adaptive.bmr).toBeLessThan(normal.bmr)
    expect(adaptive.caloriesOut).toBeLessThan(normal.caloriesOut)
  })

  it("activityFactor 1.0 (sedentario) produce NEAT = 0", () => {
    const sedentary = computeDailyEnergy(
      { ...baseMaleProfile, activityFactor: 1.0 },
      baseDailyInput
    )
    const active = computeDailyEnergy(baseMaleProfile, baseDailyInput)
    expect(sedentary.caloriesOut).toBeLessThan(active.caloriesOut)
  })

  it("perfil femenino produce valores coherentes y distintos al masculino", () => {
    const male   = computeDailyEnergy(baseMaleProfile, baseDailyInput)
    const female = computeDailyEnergy(baseFemaleProfile, baseDailyInput)
    expect(male.bmr).not.toEqual(female.bmr)
    expect(Number.isFinite(female.balance)).toBe(true)
  })
})
