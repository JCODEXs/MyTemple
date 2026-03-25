import { db } from "../../server/db"
import { computeDailyEnergy } from "../../lib/domain/energy/metabolicFunctions"
import { estimateTrainingKcal } from "../../lib/domain/energy/metabolicFunctions"
import { recommendedHydration } from "../../lib/domain/energy/metabolicFunctions"
import { adjustMetabolicFactor } from "../../lib/domain/energy/metabolicFunctions"
import type {
  ProfileInput,
  DailyInput,
  EnergyOutput,
  TrainingInput,
} from "../../lib/types"
import type { WorkoutType } from "@prisma/client"

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface LogDayInput {
  date: Date
  caloriesIn: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  workout?: {
    type: WorkoutType
    durationMinutes: number
    intensityFactor: number
    realKcal?: number
  }
}

export interface LogDayResult {
  dailyLogId: string
  energy: EnergyOutput
  hydrationMl: number
  workoutId?: string
}

export interface WeightCheckResult {
  previousFactor: number
  newFactor: number
  delta: number
  message: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// después de los imports, antes del service
function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
/**
 * Convierte UserProfile de Prisma al ProfileInput del dominio puro.
 * Este es el único punto donde Prisma y el dominio se tocan.
 */

function toProfileInput(
  profile: {
    age: number
    heightCm: number
    weightKg: number
    bodyFatPct: number | null
    sex: "MALE" | "FEMALE"
    activityFactor: number
    metabolicAdjustment: number
  }
): ProfileInput {
  return {
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    bodyFatPct: profile.bodyFatPct ?? undefined,
    sex: profile.sex,
    activityFactor: profile.activityFactor,
    metabolicAdjustment: profile.metabolicAdjustment,
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const DailyEnergyService = {
  /**
   * Registra el día completo: calcula el balance energético, persiste el
   * DailyLog y el Workout (si aplica) en una transacción atómica.
   */
  async logDay(userId: string, input: LogDayInput): Promise<LogDayResult> {
    const profile = await db.userProfile.findUnique({ where: { userId } })
    if (!profile) throw new Error("UserProfile not found for userId: " + userId)
const normalizedDate = toDateOnly(input.date) 
    const profileInput = toProfileInput(profile)

    // Construir TrainingInput para el motor si hay workout
    const trainingInput: TrainingInput | undefined = input.workout
      ? {
          durationMinutes: input.workout.durationMinutes,
          intensityFactor: input.workout.intensityFactor,
          realKcal: input.workout.realKcal,
        }
      : undefined

    const dailyInput: DailyInput = {
      caloriesIn: input.caloriesIn,
      proteinGrams: input.proteinGrams,
      carbsGrams: input.carbsGrams,
      fatGrams: input.fatGrams,
      training: trainingInput,
    }

    // Calcular energía — dominio puro, sin Prisma
    const energy = computeDailyEnergy(profileInput, dailyInput)

    // Hidratación recomendada del día
    const hydrationMl = recommendedHydration(
      profile.weightKg,
      input.workout?.durationMinutes ?? 0
    )

    // Transacción: workout + dailyLog de forma atómica
    const result = await db.$transaction(async (tx) => {
      let workoutId: string | undefined

      if (input.workout) {
        const estimatedKcal = estimateTrainingKcal(
          profile.weightKg,
          trainingInput
        )

        const workout = await tx.workout.create({
          data: {
            userId,
            date: normalizedDate,
            type: input.workout.type,
            durationMinutes: input.workout.durationMinutes,
            intensityFactor: input.workout.intensityFactor,
            estimatedKcal,
            realKcal: input.workout.realKcal ?? null,
          },
        })
        workoutId = workout.id
      }

      const dailyLog = await tx.dailyLog.upsert({
        where: {
          userId_date: {
            userId,
            date: normalizedDate,
          },
        },
        create: {
          userId,
          date: normalizedDate,
          caloriesIn: input.caloriesIn,
          proteinGrams: input.proteinGrams,
          carbsGrams: input.carbsGrams,
          fatGrams: input.fatGrams,
          caloriesOut: energy.caloriesOut,
          balance: energy.balance,
          estimatedWeightDeltaKg: energy.estimatedWeightDeltaKg,
          ...(workoutId && {
            workouts: { connect: { id: workoutId } },
          }),
        },
        update: {
          caloriesIn: input.caloriesIn,
          proteinGrams: input.proteinGrams,
          carbsGrams: input.carbsGrams,
          fatGrams: input.fatGrams,
          caloriesOut: energy.caloriesOut,
          balance: energy.balance,
          estimatedWeightDeltaKg: energy.estimatedWeightDeltaKg,
          ...(workoutId && {
            workouts: { connect: { id: workoutId } },
          }),
        },
      })

      return { dailyLogId: dailyLog.id, workoutId }
    })

    return {
      dailyLogId: result.dailyLogId,
      energy,
      hydrationMl,
      workoutId: result.workoutId,
    }
  },

  /**
   * Obtiene el DailyLog de un día específico junto con su cálculo de energía.
   * Si no existe, retorna null.
   */
  async getDay(userId: string, date: Date) {
    const normalizedDate = toDateOnly(date)
    const log = await db.dailyLog.findUnique({
      where: { userId_date: { userId, date:normalizedDate } },
      include: { workouts: true },
    })

    if (!log) return null

    return {
      ...log,
      // Expone caloriesIn como parte del output para consistencia con EnergyOutput
      caloriesIn: log.caloriesIn,
    }
  },

  /**
   * Devuelve los DailyLogs de un rango de fechas para construir gráficas
   * o calcular promedios semanales.
   */
  async getRange(userId: string, from: Date, to: Date) {
    return db.dailyLog.findMany({
      where: {
        userId,
        date: { gte: from, lte: to },
      },
      include: { workouts: true },
      orderBy: { date: "asc" },
    })
  },

  /**
   * Loop de adaptación metabólica.
   * Se llama cuando el usuario registra su peso real.
   * Compara el peso estimado (acumulado desde los DailyLogs) con el real,
   * y ajusta el metabolicAdjustment del perfil.
   *
   * Flujo:
   *   1. Busca el WeightLog más reciente previo al actual
   *   2. Suma los estimatedWeightDeltaKg de los DailyLogs del período
   *   3. Calcula peso estimado actual = pesoAnterior + Σdeltas
   *   4. Ajusta metabolicAdjustment con adaptación.ts
   *   5. Persiste el nuevo factor en UserProfile
   */
  async applyMetabolicAdaptation(
    userId: string,
    realWeightKg: number,
    date: Date
  ): Promise<WeightCheckResult> {
    const profile = await db.userProfile.findUnique({ where: { userId } })
    if (!profile) throw new Error("UserProfile not found for userId: " + userId)

    // Buscar el peso anterior registrado (el más reciente antes de hoy)
    const previousWeightLog = await db.weightLog.findFirst({
      where: { userId, date: { lt: date } },
      orderBy: { date: "desc" },
    })

    const previousWeightKg = previousWeightLog?.weightKg ?? profile.weightKg

    // Sumar deltas estimados entre el peso anterior y hoy
    const fromDate = previousWeightLog?.date ?? new Date(0)
    const dailyLogs = await db.dailyLog.findMany({
      where: {
        userId,
        date: { gt: fromDate, lte: date },
      },
    })

    const totalDelta = dailyLogs.reduce(
      (sum, log) => sum + log.estimatedWeightDeltaKg,
      0
    )
    const estimatedWeightKg = previousWeightKg + totalDelta

    // Aplicar adaptación metabólica — dominio puro
    const previousFactor = profile.metabolicAdjustment
    const newFactor = adjustMetabolicFactor(
      previousFactor,
      estimatedWeightKg,
      realWeightKg
    )
    const delta = newFactor - previousFactor

    // Persistir nuevo factor + guardar WeightLog
    const normalizedDate = toDateOnly(date)
    await db.$transaction([
      db.userProfile.update({
        where: { userId },
        data: { metabolicAdjustment: newFactor },
      }),
      db.weightLog.upsert({
        where: { userId_date: { userId, date:normalizedDate } },
        create: { userId, date:normalizedDate, weightKg: realWeightKg },
        update: { weightKg: realWeightKg },
      }),
    ])

    const direction = delta > 0 ? "aumentado" : "reducido"
    const magnitude = Math.abs(delta * 100).toFixed(2)

    return {
      previousFactor,
      newFactor,
      delta,
      message: `Factor metabólico ${direction} en ${magnitude}% (${previousFactor.toFixed(4)} → ${newFactor.toFixed(4)})`,
    }
  },

  /**
   * Resumen semanal: promedio de balance, calorías, macros y delta de peso
   * para mostrar en el dashboard.
   */
  async getWeeklySummary(userId: string, weekStart: Date) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const logs = await db.dailyLog.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
      },
    })

    if (logs.length === 0) return null

    const n = logs.length
    const sum = logs.reduce(
      (acc, log) => ({
        caloriesIn: acc.caloriesIn + log.caloriesIn,
        caloriesOut: acc.caloriesOut + log.caloriesOut,
        balance: acc.balance + log.balance,
        proteinGrams: acc.proteinGrams + log.proteinGrams,
        carbsGrams: acc.carbsGrams + log.carbsGrams,
        fatGrams: acc.fatGrams + log.fatGrams,
        estimatedWeightDeltaKg:
          acc.estimatedWeightDeltaKg + log.estimatedWeightDeltaKg,
      }),
      {
        caloriesIn: 0,
        caloriesOut: 0,
        balance: 0,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
        estimatedWeightDeltaKg: 0,
      }
    )

    return {
      days: n,
      totalEstimatedWeightDeltaKg: sum.estimatedWeightDeltaKg,
      averages: {
        caloriesIn: sum.caloriesIn / n,
        caloriesOut: sum.caloriesOut / n,
        balance: sum.balance / n,
        proteinGrams: sum.proteinGrams / n,
        carbsGrams: sum.carbsGrams / n,
        fatGrams: sum.fatGrams / n,
      },
    }
  },
}
