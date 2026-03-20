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
})


// ─────────────────────────────────────────────────────────────────────────────
// AGREGAR en src/server/api/root.ts
// ─────────────────────────────────────────────────────────────────────────────

/*
import { authRouter } from "@/server/api/routers/auth"

export const appRouter = createTRPCRouter({
  auth:          authRouter,        // ← añadir
  userProfile:   userProfileRouter,
  ingredient:    ingredientRouter,
  dailyLog:      dailyLogRouter,
  workout:       workoutRouter,
  recipe:        recipeRouter,
  coach:         coachRouter,
  nutritionPlan: nutritionPlanRouter,
})
*/


// ─────────────────────────────────────────────────────────────────────────────
// Páginas de auth — src/app/auth/
// ─────────────────────────────────────────────────────────────────────────────

/*
src/app/
  auth/
    signin/
      page.tsx        ← import { SignInPage } from "@/components/auth/SignInPage"
                         export default function Page() { return <SignInPage /> }

    register/
      page.tsx        ← import RegisterPage from "@/components/auth/RegisterPage"
                         export default function Page() { return <RegisterPage /> }

    error/
      page.tsx        ← página de error genérica de NextAuth

    subscribe/
      page.tsx        ← (Fase 2) checkout PayPal para coaches
*/


// ─────────────────────────────────────────────────────────────────────────────
// src/app/auth/error/page.tsx  —  error page de NextAuth
// ─────────────────────────────────────────────────────────────────────────────

/*
"use client"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

const ERRORS: Record<string, string> = {
  Configuration:        "Error de configuración del servidor.",
  AccessDenied:         "Acceso denegado.",
  Verification:         "El enlace ha expirado o ya fue usado.",
  OAuthAccountNotLinked:"Ya existe una cuenta con ese email. Usa tu método original.",
  SubscriptionExpired:  "Tu suscripción ha vencido. Renuévala para acceder.",
  Default:              "Ocurrió un error inesperado.",
}

export default function AuthErrorPage() {
  const params = useSearchParams()
  const error  = params.get("error") ?? "Default"
  const msg    = ERRORS[error] ?? ERRORS.Default

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c10] p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-black text-white mb-2">Error de autenticación</h1>
        <p className="text-sm text-gray-400 mb-6">{msg}</p>
        <Link href="/auth/signin"
          className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600">
          Volver al login
        </Link>
      </div>
    </div>
  )
}
*/


// ─────────────────────────────────────────────────────────────────────────────
// Instalar dependencias necesarias
// ─────────────────────────────────────────────────────────────────────────────

/*
npm install bcryptjs @types/bcryptjs

# Resend provider viene incluido en next-auth v5
# No necesita instalación adicional
*/


// ─────────────────────────────────────────────────────────────────────────────
// Actualizar src/server/api/trpc.ts para exponer publicProcedure
// ─────────────────────────────────────────────────────────────────────────────

/*
// Añadir si no existe:
export const publicProcedure = t.procedure
*/
