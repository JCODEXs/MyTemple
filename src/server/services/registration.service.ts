import bcrypt        from "bcryptjs"
import { db }        from "@/server/db"
import { TRPCError } from "@trpc/server"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name:             string
  email:            string
  password:         string
  registrationCode?: string
}

export interface RegisterResult {
  userId:          string
  role:            string
  requiresPayment: boolean   // true si es coach → redirigir a PayPal
  coachName?:      string    // si es cliente → nombre del coach vinculado
  message:         string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("")
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const RegistrationService = {

  /**
   * Registro completo con validación de código opcional.
   */
  async register(input: RegisterInput): Promise<RegisterResult> {

    // 1. Verificar que el email no exista
    const existing = await db.user.findUnique({
      where: { email: input.email },
    })
    if (existing) {
      throw new TRPCError({
        code:    "CONFLICT",
        message: "Ya existe una cuenta con este email.",
      })
    }

    // 2. Validar código de registro si viene
    let codeRecord = null
    if (input.registrationCode) {
      const code = input.registrationCode.toUpperCase().replace(/[-\s]/g, "")

      codeRecord = await db.registrationCode.findUnique({
        where:   { code },
        include: { createdByCoach: { select: { name: true, email: true } } },
      })

      if (!codeRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Código de registro no válido." })
      }
      if (codeRecord.usedAt && codeRecord.maxUses <= codeRecord.useCount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este código ya fue utilizado." })
      }
      if (codeRecord.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este código ha expirado." })
      }
    }

    // 3. Hashear contraseña
    const passwordHash = await bcrypt.hash(input.password, 12)

    // 4. Determinar rol
    const role = codeRecord?.type === "COACH" ? "COACH" : "USER"

    // 5. Crear usuario en transacción
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name:         input.name,
          email:        input.email,
          passwordHash,
          role,
          // Si es cliente → vincular coach automáticamente
          coachId: codeRecord?.type === "CLIENT"
            ? codeRecord.createdByCoachId ?? null
            : null,
        },
      })

      // Marcar código como usado
      if (codeRecord) {
        await tx.registrationCode.update({
          where: { id: codeRecord.id },
          data: {
            usedAt:   new Date(),
            usedById: user.id,
            useCount: { increment: 1 },
          },
        })
      }

      // Si es coach → crear suscripción en TRIAL
      if (role === "COACH") {
        const trialDays  = 30
        const trialEndsAt = new Date(Date.now() + trialDays * 86400000)

        await tx.subscription.create({
          data: {
            userId:           user.id,
            status:           "TRIAL",
            trialEndsAt,
            currentPeriodEnd: trialEndsAt,
            clientCodeCredits: 10,  // créditos iniciales para early access
          },
        })
      }

      return user
    })

    return {
      userId:          result.id,
      role,
      requiresPayment: role === "COACH",
      coachName:       codeRecord?.createdByCoach?.name ?? undefined,
      message: role === "COACH"
        ? "Cuenta de coach creada. Activa tu suscripción para acceder."
        : "Cuenta creada exitosamente.",
    }
  },

  /**
   * Genera un código de early access para coaches.
   * Solo puede ser llamado por ADMIN o SUPERADMIN.
   */
  async generateCoachCode(
    adminId: string,
    options?: { expiresInDays?: number; note?: string }
  ) {
    const admin = await db.user.findUnique({
      where:  { id: adminId },
      select: { role: true },
    })

    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (!admin || (admin.role !== "ADMIN")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden generar códigos de coach." })
    }

    // Verificar límite de early access
    const limit = parseInt(process.env.COACH_EARLY_ACCESS_LIMIT ?? "20")
    const coachCount = await db.user.count({ where: { role: "COACH" } })

    if (coachCount >= limit) {
      throw new TRPCError({
        code:    "PRECONDITION_FAILED",
        message: `Límite de early access alcanzado (${limit} coaches).`,
      })
    }

    const days      = options?.expiresInDays ?? 30
    const expiresAt = new Date(Date.now() + days * 86400000)

    return db.registrationCode.create({
      data: {
        code:            generateCode(12),
        type:            "COACH",
        expiresAt,
        maxUses:         1,
        createdByCoachId: null,
      },
    })
  },

  /**
   * Verifica si un código es válido y retorna su tipo — para mostrar en UI antes de registrarse.
   */
  async previewCode(code: string) {
    const record = await db.registrationCode.findUnique({
      where:   { code: code.toUpperCase().replace(/[-\s]/g, "") },
      include: { createdByCoach: { select: { name: true } } },
    })

    if (!record)                                              return { valid: false, reason: "Código no encontrado." }
    if (record.expiresAt < new Date())                        return { valid: false, reason: "Código expirado." }
    if (record.useCount >= record.maxUses && record.usedAt)   return { valid: false, reason: "Código ya utilizado." }

    return {
      valid:      true,
      type:       record.type,
      coachName:  record.createdByCoach?.name ?? null,
      expiresAt:  record.expiresAt,
    }
  },
 /**
   * Actualiza el nombre y/o email de un usuario.
   */
    async updateAccount(userId: string, input: { name?: string; email?: string }) {
    // Si cambia el email, verificar que no esté en uso
    if (input.email) {
      const existing = await db.user.findFirst({
        where: { email: input.email, NOT: { id: userId } },
        select: { id: true },
      })
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Este email ya está en uso." })
      }
    }

    return db.user.update({
      where: { id: userId },
      data: {
        ...(input.name  && { name:  input.name  }),
        ...(input.email && { email: input.email, emailVerified: null }),
      },
      select: { id: true, name: true, email: true },
    })
  },
}

