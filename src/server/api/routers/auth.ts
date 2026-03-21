// ─────────────────────────────────────────────────────────────────────────────
// src/server/api/routers/auth.ts  —  tRPC router público para auth
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod"
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc"
import { RegistrationService } from "@/server/services/registration.service"

export const authRouter = createTRPCRouter({

  /**
   * Registro de nuevo usuario — público, sin autenticación previa.
   */
  register: publicProcedure
    .input(z.object({
      name:             z.string().min(2).max(60),
      email:            z.string().email(),
      password:         z.string().min(8).max(100),
      registrationCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return RegistrationService.register(input)
    }),

  /**
   * Preview de código — valida sin consumirlo.
   * Usado en tiempo real mientras el usuario escribe el código.
   */
  previewCode: publicProcedure
    .input(z.object({ code: z.string().min(6) }))
    .query(async ({ input }) => {
      return RegistrationService.previewCode(input.code)
    }),

  /**
   * Genera un código de coach — solo ADMIN.
   */
  generateCoachCode: protectedProcedure
    .input(z.object({
      expiresInDays: z.number().int().min(1).max(365).default(30),
    }))
    .mutation(async ({ ctx, input }) => {
      return RegistrationService.generateCoachCode(ctx.session.user.id, {
        expiresInDays: input.expiresInDays,
      })
    }),
     updateAccount: protectedProcedure
    .input(z.object({
      name:  z.string().min(2).max(60).optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return RegistrationService.updateAccount(ctx.session.user.id, input)
    }),
})




// ─────────────────────────────────────────────────────────────────────────────
// Actualizar src/server/api/trpc.ts para exponer publicProcedure
// ─────────────────────────────────────────────────────────────────────────────

/*
// Añadir si no existe:
export const publicProcedure = t.procedure
*/
