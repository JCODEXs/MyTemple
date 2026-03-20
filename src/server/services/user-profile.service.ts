import { db } from "@/server/db"
import type { Sex, GoalType } from "../../../generated/prisma"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateProfileInput {
  age: number
  heightCm: number
  weightKg: number
  bodyFatPct?: number
  sex: Sex
  goal: GoalType
  activityFactor?: number
}

export interface UpdateProfileInput extends Partial<CreateProfileInput> {}

// ─── Service ──────────────────────────────────────────────────────────────────

export const UserProfileService = {

  async get(userId: string) {
    return db.userProfile.findUnique({
  where: { userId },
  include: {
    user: {
      select: {
        id: true, name: true, email: true, role: true,
        coach: { select: { id: true, name: true, email: true } },
      },
    },
  },
})
  },

  async create(userId: string, input: CreateProfileInput) {
    const existing = await db.userProfile.findUnique({ where: { userId } })
    if (existing) {
      throw new Error("El perfil ya existe para este usuario. Usa update.")
    }

    // Registrar peso inicial en WeightLog
    const profile = await db.$transaction(async (tx) => {
      const created = await tx.userProfile.create({
        data: {
          userId,
          age: input.age,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
          bodyFatPct: input.bodyFatPct ?? null,
          sex: input.sex,
          goal: input.goal,
          activityFactor: input.activityFactor ?? 1.2,
          metabolicAdjustment: 1.0,
        },
      })

      await tx.weightLog.create({
        data: {
          userId,
          date: new Date(),
          weightKg: input.weightKg,
        },
      })

      return created
    })

    return profile
  },

  async update(userId: string, input: UpdateProfileInput) {
    const profile = await db.userProfile.findUnique({ where: { userId } })
    if (!profile) {
      throw new Error("Perfil no encontrado. Crea tu perfil primero.")
    }

    // Si cambia el peso, registrar en WeightLog también
    if (input.weightKg !== undefined && input.weightKg !== profile.weightKg) {
      await db.$transaction([
        db.userProfile.update({
          where: { userId },
          data: input,
        }),
        db.weightLog.create({
          data: {
            userId,
            date: new Date(),
            weightKg: input.weightKg,
          },
        }),
      ])
      return db.userProfile.findUnique({ where: { userId } })
    }

    return db.userProfile.update({
      where: { userId },
      data: input,
    })
  },

  /**
   * Devuelve el perfil con el último peso registrado y el peso
   * estimado acumulado desde los DailyLogs — útil para el dashboard.
   */
  async getSummary(userId: string) {
    const [profile, latestWeight, totalDelta] = await Promise.all([
      db.userProfile.findUnique({ where: { userId } }),
      db.weightLog.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
      }),
      db.dailyLog.aggregate({
        where: { userId },
        _sum: { estimatedWeightDeltaKg: true },
      }),
    ])

    if (!profile) return null

    const estimatedCurrentWeight =
      profile.weightKg + (totalDelta._sum.estimatedWeightDeltaKg ?? 0)

    return {
      ...profile,
      latestLoggedWeight: latestWeight?.weightKg ?? profile.weightKg,
      latestWeightDate: latestWeight?.date ?? null,
      estimatedCurrentWeight,
    }
  },
}
