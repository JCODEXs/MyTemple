export type Sex = "MALE" | "FEMALE"

export interface ProfileInput {
  age: number
  heightCm: number
  weightKg: number
  bodyFatPct?: number
  sex: Sex
  activityFactor: number
  metabolicAdjustment: number
}

export interface TrainingInput {
  durationMinutes: number
  intensityFactor: number
  realKcal?: number
}

export interface DailyInput {
  caloriesIn: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  training?: TrainingInput
}

export interface EnergyOutput {
  bmr: number
  tdee: number
  caloriesOut: number
  caloriesIn:number 
  balance: number
  estimatedWeightDeltaKg: number
}