// ─────────────────────────────────────────────────────────────────────────────
// src/app/api/v1/workouts/route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { WorkoutService } from "@/server/services/workout.service"
import { WorkoutType } from "@prisma/client"
import { z } from "zod"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createWorkoutSchema = z.object({
  date: z.coerce.date(),
  type: z.nativeEnum(WorkoutType),
  durationMinutes: z.number().positive().max(600),
  intensityFactor: z.number().min(1).max(20),
  realKcal: z.number().positive().optional(),
})

const updateWorkoutSchema = z.object({
  type: z.nativeEnum(WorkoutType).optional(),
  durationMinutes: z.number().positive().max(600).optional(),
  intensityFactor: z.number().min(1).max(20).optional(),
  realKcal: z.number().positive().nullable().optional(),
})

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

// ─── Collection handlers ──────────────────────────────────────────────────────

/**
 * GET /api/v1/workouts
 *
 * Query params:
 *   ?from=2024-01-01&to=2024-01-31   → rango de fechas
 *   ?from=...&to=...&summary=true    → resumen del rango
 */
export async function GET(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  if (!from || !to) {
    return NextResponse.json(
      { error: "Parámetros requeridos: from, to" },
      { status: 400 }
    )
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 })
  }

  if (fromDate > toDate) {
    return NextResponse.json({ error: "'from' debe ser anterior a 'to'" }, { status: 400 })
  }

  try {
    if (searchParams.get("summary") === "true") {
      const summary = await WorkoutService.getSummary(userId, fromDate, toDate)
      return NextResponse.json(summary)
    }

    const workouts = await WorkoutService.getRange(userId, fromDate, toDate)
    return NextResponse.json(workouts)
  } catch (error) {
    console.error("[GET /api/v1/workouts]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

/**
 * POST /api/v1/workouts
 * Crea un entrenamiento. Estima kcal automáticamente desde el perfil del usuario.
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body: unknown = await req.json()
    const parsed = createWorkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const workout = await WorkoutService.create(userId, parsed.data)
    return NextResponse.json(workout, { status: 201 })
  } catch (error) {
    const msg = (error as Error).message
    if (msg.includes("Perfil no encontrado")) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    console.error("[POST /api/v1/workouts]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

