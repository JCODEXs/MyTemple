// ─────────────────────────────────────────────────────────────────────────────
// src/server/services/admin.service.ts
// ─────────────────────────────────────────────────────────────────────────────

import { db }        from "@/server/db"
import { TRPCError } from "@trpc/server"
import type { UserRole } from "../../../generated/prisma"

export const AdminService = {

  async requireAdmin(userId: string) {
    const user = await db.user.findUnique({
      where:  { id: userId },
      select: { role: true },
    })
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (!user || user.role !== "ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acceso restringido a administradores." })
    }
  },

  // ── Global stats ────────────────────────────────────────────────────────────
  async getStats(adminId: string) {
    await AdminService.requireAdmin(adminId)

    const [totalUsers, totalCoaches, totalClients, totalPlans, totalRecipes, recentUsers] =
      await Promise.all([
        db.user.count(),
        db.user.count({ where: { role: "COACH" } }),
        db.user.count({ where: { coachId: { not: null } } }),
        db.nutritionPlan.count(),
        db.recipe.count(),
        db.user.findMany({
          orderBy: { createdAt: "desc" },
          take:    5,
          select:  { id: true, name: true, email: true, role: true, createdAt: true },
        }),
      ])

    const activeSubscriptions = await db.subscription.count({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
    })

    return {
      totalUsers,
      totalCoaches,
      totalClients,
      totalPlans,
      totalRecipes,
      activeSubscriptions,
      recentUsers,
    }
  },

  // ── Users ───────────────────────────────────────────────────────────────────
  async getUsers(adminId: string, filters: {
    search?: string
    role?:   UserRole
    page?:   number
    limit?:  number
  }) {
    await AdminService.requireAdmin(adminId)

    const page  = filters.page  ?? 1
    const limit = filters.limit ?? 20
    const skip  = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (filters.role)   where.role  = filters.role
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { name:  { contains: filters.search, mode: "insensitive" } },
      ]
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          profile:      { select: { goal: true, weightKg: true } },
          subscription: { select: { status: true, currentPeriodEnd: true, clientCodeCredits: true } },
          _count:       { select: { clients: true } },
        },
      }),
      db.user.count({ where }),
    ])

    return { users, total, page, pages: Math.ceil(total / limit) }
  },

  // ── Change role ─────────────────────────────────────────────────────────────
  async changeRole(adminId: string, targetUserId: string, newRole: UserRole) {
    await AdminService.requireAdmin(adminId)

    if (targetUserId === adminId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes cambiar tu propio rol." })
    }

    return db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: targetUserId },
        data:  { role: newRole },
      })

      // Si se promueve a coach y no tiene suscripción → crear TRIAL
      if (newRole === "COACH") {
        const existing = await tx.subscription.findUnique({ where: { userId: targetUserId } })
        if (!existing) {
          const trialEndsAt = new Date(Date.now() + 30 * 86400000)
          await tx.subscription.create({
            data: {
              userId:            targetUserId,
              status:            "TRIAL",
              trialEndsAt,
              currentPeriodEnd:  trialEndsAt,
              clientCodeCredits: 10,
            },
          })
        }
      }

      return user
    })
  },

  // ── Registration codes ──────────────────────────────────────────────────────
  async generateCoachCode(adminId: string, expiresInDays = 30) {
    await AdminService.requireAdmin(adminId)

    const limit      = parseInt(process.env.COACH_EARLY_ACCESS_LIMIT ?? "50")
    const coachCount = await db.user.count({ where: { role: "COACH" } })

    if (coachCount >= limit) {
      throw new TRPCError({
        code:    "PRECONDITION_FAILED",
        message: `Límite de early access alcanzado (${limit} coaches).`,
      })
    }

    const chars     = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const code      = Array.from({ length: 12 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("")
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000)

    return db.registrationCode.create({
      data: { code, type: "COACH", expiresAt, maxUses: 1 },
    })
  },

  async getCodes(adminId: string) {
    await AdminService.requireAdmin(adminId)
    return db.registrationCode.findMany({
      orderBy: { createdAt: "desc" },
      take:    50,
      include: {
        usedBy: { select: { name: true, email: true } },
      },
    })
  },

  // ── Subscriptions ───────────────────────────────────────────────────────────
  async getSubscriptions(adminId: string) {
    await AdminService.requireAdmin(adminId)
    return db.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })
  },

  async updateSubscription(adminId: string, subscriptionId: string, data: {
    status?:           "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIAL"
    clientCodeCredits?: number
  }) {
    await AdminService.requireAdmin(adminId)
    return db.subscription.update({ where: { id: subscriptionId }, data })
  },
}

