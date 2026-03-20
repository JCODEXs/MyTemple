import type { ProfileInput, TrainingInput, DailyInput, EnergyOutput } from "../../types"

/**
 * computeBMR
 *
 * Calcula la tasa metabólica basal (BMR), es decir,
 * la energía mínima necesaria para mantener las funciones
 * fisiológicas básicas del cuerpo en reposo:
 *
 * - respiración
 * - circulación
 * - mantenimiento celular
 * - actividad cerebral
 *
 * Este valor representa aproximadamente entre
 * el 60% y 75% del gasto energético total diario.
 *
 * Se implementan dos modelos fisiológicos:
 *
 * ----------------------------------------------------------------
 * 1. Mifflin-St Jeor Equation (1990)
 * ----------------------------------------------------------------
 *
 * Es el modelo más utilizado clínicamente y uno de los
 * más precisos para población general.
 *
 * Hombre:
 *
 * BMR = 10W + 6.25H − 5A + 5
 *
 * Mujer:
 *
 * BMR = 10W + 6.25H − 5A − 161
 *
 * donde:
 *
 * W = peso (kg)
 * H = altura (cm)
 * A = edad (años)
 *
 * Estudios muestran que esta ecuación tiene menor error
 * que Harris-Benedict en individuos modernos.
 *
 * ----------------------------------------------------------------
 * 2. Cunningham Equation
 * ----------------------------------------------------------------
 *
 * Más apropiada cuando se conoce la masa magra
 * (fat-free mass).
 *
 * BMR = 500 + 22 × LBM
 *
 * donde:
 *
 * LBM = masa libre de grasa en kg
 *
 * Este modelo refleja mejor la fisiología real porque
 * el metabolismo basal está fuertemente determinado
 * por el tejido metabólicamente activo:
 *
 * - músculo
 * - órganos
 * - tejido visceral
 *
 * ----------------------------------------------------------------
 *
 * Estrategia utilizada por el motor:
 *
 * - Si se conoce bodyFat → usar Cunningham
 * - Si no → usar Mifflin-St Jeor
 *
 */

export function computeBMR({
  weightKg,
  heightCm,
  age,
  sex,
  bodyFatPct
}: {
  weightKg: number
  heightCm: number
  age: number
  sex: "MALE" | "FEMALE"
  bodyFatPct?: number
}) {

  if (bodyFatPct) {

    const leanMass = weightKg * (1 - bodyFatPct / 100)

    return 500 + 22 * leanMass
  }

  if (sex === "MALE") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  }

  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
}

export function calculateBMR(profile: ProfileInput): number {
  const base =
    10 * profile.weightKg +
    6.25 * profile.heightCm -
    5 * profile.age

  const sexAdjustment = profile.sex === "MALE" ? 5 : -161

  return (base + sexAdjustment) * profile.metabolicAdjustment
}

const TRAINING_CONSTANT = 0.0175

export function estimateTrainingKcal(
  weightKg: number,
  training?: TrainingInput
): number {
  if (!training) return 0

  const estimated =
    TRAINING_CONSTANT *
    training.intensityFactor *
    weightKg *
    training.durationMinutes

  return training.realKcal ?? estimated
}

export function calculateTEF(
  proteinGrams: number,
  carbsGrams: number,
  fatGrams: number
): number {
  const proteinKcal = proteinGrams * 4
  const carbsKcal = carbsGrams * 4
  const fatKcal = fatGrams * 9

  return (
    proteinKcal * 0.25 +
    carbsKcal * 0.07 +
    fatKcal * 0.02
  )
}

export function adjustMetabolicFactor(
  currentFactor: number,
  estimatedWeightKg: number,
  realWeightKg: number,
  alpha = 0.05
): number {

  const error = realWeightKg - estimatedWeightKg
  const adjustment = 1 + alpha * error

  return currentFactor * adjustment
}

export function recommendedHydration(
  weightKg: number,
  trainingMinutes = 0
): number {
  return weightKg * 35 + trainingMinutes * 12
}

export function computeDailyEnergy(
  profile: ProfileInput,
  daily: DailyInput
): EnergyOutput {

  const bmr = calculateBMR(profile)

  const neat = bmr * (profile.activityFactor - 1)

  const trainingKcal = estimateTrainingKcal(
    profile.weightKg,
    daily.training
  )

  const tef = calculateTEF(
    daily.proteinGrams,
    daily.carbsGrams,
    daily.fatGrams
  )
  const caloriesIn=daily.caloriesIn;

  const caloriesOut = bmr + neat + trainingKcal + tef
  const balance = daily.caloriesIn - caloriesOut
  const estimatedWeightDeltaKg = balance / 7700

  return {
    bmr,
    tdee: caloriesOut,
    caloriesIn,
    caloriesOut,
    balance,
    estimatedWeightDeltaKg
  }
}