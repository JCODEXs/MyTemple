// ─────────────────────────────────────────────────────────────────────────────
// src/app/(dashboard)/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

import Dashboard from "@/app/_components/domain/Dashboard"

export const metadata = { title: "Dashboard" }

export default function DashboardPage() {
  return <Dashboard />
}


// ─────────────────────────────────────────────────────────────────────────────
// ADDITION to src/server/api/routers/daily-log.ts
// Agregar este procedure al dailyLogRouter existente:
// ─────────────────────────────────────────────────────────────────────────────

/*
  // Exponer el bmr calculado junto con el DailyLog
  // El dashboard necesita el bmr del día para separar TMB vs training

  getDayWithBMR: protectedProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const [log, profile] = await Promise.all([
        DailyEnergyService.getDay(ctx.session.user.id, input.date),
        db.userProfile.findUnique({ where: { userId: ctx.session.user.id } }),
      ])

      if (!log || !profile) return null

      const bmr = (10 * profile.weightKg + 6.25 * profile.heightCm
        - 5 * profile.age + (profile.sex === "MALE" ? 5 : -161))
        * profile.metabolicAdjustment

      return { ...log, bmr }
    }),
*/


// ─────────────────────────────────────────────────────────────────────────────
// ADDITION to src/server/api/routers/user-profile.ts
// El getSummary ya devuelve estimatedCurrentWeight y latestLoggedWeight
// pero necesitamos también el objeto user para el nombre en el saludo.
// Asegúrate que el service incluye la relación user:
// ─────────────────────────────────────────────────────────────────────────────

/*
  // En user-profile.service.ts, en getSummary(), cambiar:
  db.userProfile.findUnique({ where: { userId } })
  // por:
  db.userProfile.findUnique({
    where: { userId },
    include: { user: { select: { name: true, email: true } } }
  })
*/
