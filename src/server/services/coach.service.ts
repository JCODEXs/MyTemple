import { db } from "@/server/db"
import { TRPCError } from "@trpc/server"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // sin O,0,I,1 para evitar confusión
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("")
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const CoachService = {

  /**
   * El coach genera un código de invitación válido por 7 días.
   * Puede tener múltiples códigos activos simultáneamente.
   */
  async generateInviteCode(coachId: string) {
    // Verificar que el usuario tiene rol COACH o ADMIN
    const user = await db.user.findUnique({
      where: { id: coachId },
      select: { role: true },
    })
    if (!user || (user.role !== "COACH" && user.role !== "ADMIN")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Solo los coaches pueden generar códigos de invitación.",
      })
    }

    const code      = generateCode()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días

    return db.coachInviteCode.create({
      data: { coachId, code, expiresAt },
    })
  },

  /**
   * Lista los códigos activos del coach (no usados y no expirados).
   */
  async getActiveCodes(coachId: string) {
    return db.coachInviteCode.findMany({
      where: {
        coachId,
        usedAt:    null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    })
  },

  /**
   * El usuario ingresa el código para vincularse con su coach.
   */
  async redeemCode(userId: string, code: string) {
    const invite = await db.coachInviteCode.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: { coach: { select: { id: true, name: true, email: true } } },
    })

    if (!invite) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Código no válido." })
    }
    if (invite.usedAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Este código ya fue utilizado." })
    }
    if (invite.expiresAt < new Date()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Este código ha expirado." })
    }
    if (invite.coachId === userId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes vincularte a ti mismo." })
    }

    // Verificar que el usuario no tenga ya un coach
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { coachId: true },
    })
    if (user?.coachId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Ya tienes un coach asignado. Desvincula el actual primero.",
      })
    }

    // Vincular usuario con coach + marcar código como usado
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data:  { coachId: invite.coachId },
      }),
      db.coachInviteCode.update({
        where: { id: invite.id },
        data:  { usedAt: new Date(), usedById: userId },
      }),
    ])

    return {
      coachName:  invite.coach.name ?? invite.coach.email,
      coachEmail: invite.coach.email,
    }
  },

  /**
   * El usuario se desvincula de su coach.
   */
  async unlinkCoach(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { coachId: true },
    })
    if (!user?.coachId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No tienes un coach asignado." })
    }

    return db.user.update({
      where: { id: userId },
      data:  { coachId: null },
    })
  },

  /**
   * El coach desvincula a un cliente.
   */
  async unlinkClient(coachId: string, clientId: string) {
    const client = await db.user.findUnique({
      where: { id: clientId },
      select: { coachId: true },
    })
    if (!client || client.coachId !== coachId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado." })
    }

    return db.user.update({
      where: { id: clientId },
      data:  { coachId: null },
    })
  },

  /**
   * Lista de clientes del coach con su perfil y último log.
   */
  async getClients(coachId: string) {
    const clients = await db.user.findMany({
      where: { coachId },
      include: {
        profile: true,
        dailyLogs: {
          orderBy: { date: "desc" },
          take:    1,
        },
        weightLogs: {
          orderBy: { date: "desc" },
          take:    1,
        },
      },
    })

    return clients.map((c) => ({
      id:          c.id,
      name:        c.name,
      email:       c.email,
      image:       c.image,
      profile:     c.profile,
      lastLog:     c.dailyLogs[0]   ?? null,
      lastWeight:  c.weightLogs[0]  ?? null,
    }))
  },

  /**
   * El coach ve el dashboard de un cliente específico.
   * Verifica que el cliente pertenece al coach antes de devolver datos.
   */
  async getClientData(coachId: string, clientId: string) {
    const client = await db.user.findUnique({
      where:   { id: clientId },
      include: { profile: true },
    })

    if (!client || client.coachId !== coachId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este cliente." })
    }

    const today      = new Date()
    const weekStart  = new Date(today)
    const day        = today.getDay()
    weekStart.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
    weekStart.setHours(0, 0, 0, 0)

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
  async getClientPlans(coachId: string, clientId: string) {
    const client = await db.user.findUnique({
      where: { id: clientId },
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
