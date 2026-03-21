import { db }        from "@/server/db"
import { TRPCError } from "@trpc/server"

export const CoachService = {

  // ── Generate client invite code ────────────────────────────────────────────

  async generateInviteCode(coachId: string) {
    const user = await db.user.findUnique({
      where:  { id: coachId },
      select: { role: true },
    })
    if (!user || (user.role !== "COACH" && user.role !== "ADMIN")) {
      throw new TRPCError({
        code:    "FORBIDDEN",
        message: "Solo los coaches pueden generar códigos.",
      })
    }

    const chars     = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const code      = Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    return db.registrationCode.create({
      data: {
        code,
        type:             "CLIENT",
        expiresAt,
        maxUses:          1,
        createdByCoachId: coachId,
      },
    })
  },

  // ── Get active codes ───────────────────────────────────────────────────────

  async getActiveCodes(coachId: string) {
    return db.registrationCode.findMany({
      where: {
        createdByCoachId: coachId,
        type:             "CLIENT",   // ← añadido para mayor precisión
        usedAt:           null,
        expiresAt:        { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    })
  },

  // ── Redeem code (user links to coach via existing account) ─────────────────
  // Este método es para usuarios YA registrados que quieren vincularse
  // a un coach ingresando el código en ProfilePage → tab Coach.

  async redeemCode(userId: string, code: string) {
    const invite = await db.registrationCode.findUnique({  // ← era db.coachInviteCode
      where:   { code: code.toUpperCase().trim() },
      include: {
        createdByCoach: { select: { id: true, name: true, email: true } },  // ← era invite.coach
      },
    })

    if (!invite) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Código no válido." })
    }
    if (invite.usedAt && invite.useCount >= invite.maxUses) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Este código ya fue utilizado." })
    }
    if (invite.expiresAt < new Date()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Este código ha expirado." })
    }
    if (!invite.createdByCoachId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Este código no es un código de coach." })
    }
    if (invite.createdByCoachId === userId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes vincularte a ti mismo." })
    }

    const user = await db.user.findUnique({
      where:  { id: userId },
      select: { coachId: true },
    })
    if (user?.coachId) {
      throw new TRPCError({
        code:    "CONFLICT",
        message: "Ya tienes un coach asignado. Desvincula el actual primero.",
      })
    }

    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data:  { coachId: invite.createdByCoachId },  // ← era invite.coachId
      }),
      db.registrationCode.update({                    // ← era db.coachInviteCode
        where: { id: invite.id },
        data:  {
          usedAt:   new Date(),
          usedById: userId,
          useCount: { increment: 1 },                 // ← añadido, faltaba
        },
      }),
    ])

    return {
      coachName:  invite.createdByCoach?.name  ?? invite.createdByCoach?.email ?? "tu coach",
      coachEmail: invite.createdByCoach?.email ?? "",
    }
  },

  // ── Unlink coach ───────────────────────────────────────────────────────────

  async unlinkCoach(userId: string) {
    const user = await db.user.findUnique({
      where:  { id: userId },
      select: { coachId: true },
    })
    if (!user?.coachId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No tienes un coach asignado." })
    }
    return db.user.update({ where: { id: userId }, data: { coachId: null } })
  },

  // ── Unlink client ──────────────────────────────────────────────────────────

  async unlinkClient(coachId: string, clientId: string) {
    const client = await db.user.findUnique({
      where:  { id: clientId },
      select: { coachId: true },
    })
    if (!client || client.coachId !== coachId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado." })
    }
    return db.user.update({ where: { id: clientId }, data: { coachId: null } })
  },

  // ── Get clients ────────────────────────────────────────────────────────────

  async getClients(coachId: string) {
    const clients = await db.user.findMany({
      where: { coachId },
      include: {
        profile:    true,
        dailyLogs:  { orderBy: { date: "desc" }, take: 1 },
        weightLogs: { orderBy: { date: "desc" }, take: 1 },
      },
    })

    return clients.map((c) => ({
      id:         c.id,
      name:       c.name,
      email:      c.email,
      image:      c.image,
      profile:    c.profile,
      lastLog:    c.dailyLogs[0]  ?? null,
      lastWeight: c.weightLogs[0] ?? null,
    }))
  },

  // ── Get client dashboard data ──────────────────────────────────────────────

  async getClientData(coachId: string, clientId: string) {
    const client = await db.user.findUnique({
      where:   { id: clientId },
      include: { profile: true },
    })

    if (!client || client.coachId !== coachId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este cliente." })
    }

    const today     = new Date()
    today.setHours(0, 0, 0, 0)

    const weekStart = new Date(today)
    const day       = today.getDay()
    weekStart.setDate(today.getDate() - (day === 0 ? 6 : day - 1))

    const [todayLog, weekLogs, weightLogs] = await Promise.all([
      db.dailyLog.findUnique({
        where: { userId_date: { userId: clientId, date: today } },
      }),
      db.dailyLog.findMany({
        where:   { userId: clientId, date: { gte: weekStart } },
        orderBy: { date: "asc" },
      }),
      db.weightLog.findMany({
        where:   { userId: clientId },
        orderBy: { date: "desc" },
        take:    30,
      }),
    ])

    return { client, todayLog, weekLogs, weightLogs }
  },

  // ── Get client plans ───────────────────────────────────────────────────────

  async getClientPlans(coachId: string, clientId: string) {
    const client = await db.user.findUnique({
      where:  { id: clientId },
      select: { coachId: true },
    })
    if (!client || client.coachId !== coachId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este cliente." })
    }

    return db.nutritionPlan.findMany({
      where:   { userId: clientId },
      orderBy: { startDate: "desc" },
    })
  },
}