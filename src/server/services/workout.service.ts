import { db } from "@/server/db"
import { estimateTrainingKcal } from "../../lib/domain/energy/metabolicFunctions"
import type { WorkoutType } from "../../../generated/prisma"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateWorkoutInput {
  date: Date
  type: WorkoutType
  durationMinutes: number
  intensityFactor: number
  realKcal?: number
}

export interface UpdateWorkoutInput {
  type?: WorkoutType
  durationMinutes?: number
  intensityFactor?: number
  realKcal?: number | null
}

export interface WorkoutSummary {
  totalWorkouts: number
  totalMinutes: number
  totalKcalBurned: number
  averageIntensity: number
  byType: Record<string, number>
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const WorkoutService = {

  async create(userId: string, input: CreateWorkoutInput) {
    const profile = await db.userProfile.findUnique({ where: { userId } })
    if (!profile) throw new Error("Perfil no encontrado. Crea tu perfil primero.")

    const estimatedKcal = estimateTrainingKcal(profile.weightKg, {
      durationMinutes: input.durationMinutes,
      intensityFactor: input.intensityFactor,
      realKcal: input.realKcal,
    })

    return db.workout.create({
      data: {
        userId,
        date: input.date,
        type: input.type,
        durationMinutes: input.durationMinutes,
        intensityFactor: input.intensityFactor,
        estimatedKcal,
        realKcal: input.realKcal ?? null,
      },
    })
  },

  async update(userId: string, workoutId: string, input: UpdateWorkoutInput) {
    const workout = await db.workout.findFirst({
      where: { id: workoutId, userId },
    })
    if (!workout) throw new Error("Entrenamiento no encontrado.")

    // Re-estimar kcal si cambian duración o intensidad
    const needsRecalc =
      input.durationMinutes !== undefined || input.intensityFactor !== undefined

    let estimatedKcal = workout.estimatedKcal

    if (needsRecalc) {
      const profile = await db.userProfile.findUnique({ where: { userId } })
      if (!profile) throw new Error("Perfil no encontrado.")

      estimatedKcal = estimateTrainingKcal(profile.weightKg, {
        durationMinutes: input.durationMinutes ?? workout.durationMinutes,
        intensityFactor: input.intensityFactor ?? workout.intensityFactor,
        realKcal: input.realKcal ?? workout.realKcal ?? undefined,
      })
    }

    return db.workout.update({
      where: { id: workoutId },
      data: { ...input, estimatedKcal },
    })
  },

  async delete(userId: string, workoutId: string) {
    const workout = await db.workout.findFirst({
      where: { id: workoutId, userId },
    })
    if (!workout) throw new Error("Entrenamiento no encontrado.")

    return db.workout.delete({ where: { id: workoutId } })
  },

  async getOne(userId: string, workoutId: string) {
    const workout = await db.workout.findFirst({
      where: { id: workoutId, userId },
      include: { sessions: true },
    })
    if (!workout) return null
    return workout
  },

  async getRange(userId: string, from: Date, to: Date) {
    return db.workout.findMany({
      where: {
        userId,
        date: { gte: from, lte: to },
      },
      include: { sessions: true },
      orderBy: { date: "desc" },
    })
  },

  /**
   * Resumen de un rango — para el dashboard de progreso.
   */
  async getSummary(userId: string, from: Date, to: Date): Promise<WorkoutSummary> {
    const workouts = await db.workout.findMany({
      where: { userId, date: { gte: from, lte: to } },
    })

    if (workouts.length === 0) {
      return {
        totalWorkouts: 0,
        totalMinutes: 0,
        totalKcalBurned: 0,
        averageIntensity: 0,
        byType: {},
      }
    }

    const totalMinutes = workouts.reduce((s, w) => s + w.durationMinutes, 0)
    const totalKcalBurned = workouts.reduce(
      (s, w) => s + (w.realKcal ?? w.estimatedKcal),
      0
    )
    const averageIntensity =
      workouts.reduce((s, w) => s + w.intensityFactor, 0) / workouts.length

    const byType = workouts.reduce<Record<string, number>>((acc, w) => {
      acc[w.type] = (acc[w.type] ?? 0) + 1
      return acc
    }, {})

    return {
      totalWorkouts: workouts.length,
      totalMinutes,
      totalKcalBurned,
      averageIntensity,
      byType,
    }
  },
}
