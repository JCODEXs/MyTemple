import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth"

import { DailyEnergyService } from "@/server/services/daily-energy.service"
import { WorkoutType } from "@prisma/client"
import { z } from "zod"

// ─── Schemas (mismos que tRPC, reutilizados) ──────────────────────────────────

const workoutInputSchema = z.object({
  type: z.nativeEnum(WorkoutType),
  durationMinutes: z.number().positive(),
  intensityFactor: z.number().min(1).max(20),
  realKcal: z.number().positive().optional(),
})

const logDaySchema = z.object({
  date: z.coerce.date(),
  caloriesIn: z.number().positive(),
  proteinGrams: z.number().min(0),
  carbsGrams: z.number().min(0),
  fatGrams: z.number().min(0),
  workout: workoutInputSchema.optional(),
})

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/daily-logs
 *
 * Query params:
 *   ?date=2024-01-15              → un día específico
 *   ?from=2024-01-01&to=2024-01-07 → rango de fechas
 *   ?weekStart=2024-01-15         → resumen semanal
 */
export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl

  try {
    // Resumen semanal
    if (searchParams.has("weekStart")) {
      const weekStart = new Date(searchParams.get("weekStart")!)
      if (isNaN(weekStart.getTime())) {
        return NextResponse.json({ error: "weekStart inválido" }, { status: 400 })
      }
      const summary = await DailyEnergyService.getWeeklySummary(userId, weekStart)
      return NextResponse.json(summary ?? { message: "Sin datos para esta semana" })
    }

    // Rango de fechas
    if (searchParams.has("from") && searchParams.has("to")) {
      const from = new Date(searchParams.get("from")!)
      const to   = new Date(searchParams.get("to")!)
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 })
      }
      if (from > to) {
        return NextResponse.json({ error: "'from' debe ser anterior a 'to'" }, { status: 400 })
      }
      const logs = await DailyEnergyService.getRange(userId, from, to)
      return NextResponse.json(logs)
    }

    // Día específico
    if (searchParams.has("date")) {
      const date = new Date(searchParams.get("date")!)
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: "Fecha inválida" }, { status: 400 })
      }
      const log = await DailyEnergyService.getDay(userId, date)
      if (!log) {
        return NextResponse.json({ error: "No hay registro para esta fecha" }, { status: 404 })
      }
      return NextResponse.json(log)
    }

    return NextResponse.json(
      { error: "Parámetros requeridos: date | from+to | weekStart" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[GET /api/v1/daily-logs]", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/**
 * POST /api/v1/daily-logs
 *
 * Body: LogDayInput
 * Registra el día y devuelve el balance energético calculado.
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body: unknown = await req.json()
    const parsed = logDaySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const result = await DailyEnergyService.logDay(userId, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("[POST /api/v1/daily-logs]", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}