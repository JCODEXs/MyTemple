

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
 * GET /api/v1/workouts/:id
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise< { id: string } >}
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
const { id } = await params
  try {
    const workout = await WorkoutService.getOne(userId, id)
    if (!workout) return NextResponse.json({ error: "Entrenamiento no encontrado" }, { status: 404 })
    return NextResponse.json(workout)
  } catch (error) {
    console.error("[GET /api/v1/workouts/:id]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/workouts/:id
 * Actualiza un entrenamiento. Re-estima kcal si cambian duración o intensidad.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
const { id } = await params
  try {
    const body: unknown = await req.json()
    const parsed = updateWorkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const workout = await WorkoutService.update(userId, id, parsed.data)
    return NextResponse.json(workout)
  } catch (error) {
    const msg = (error as Error).message
    if (msg.includes("no encontrado")) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    console.error("[PATCH /api/v1/workouts/:id]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/workouts/:id
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
const { id } = await params
  try {
    await WorkoutService.delete(userId, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = (error as Error).message
    if (msg.includes("no encontrado")) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    console.error("[DELETE /api/v1/workouts/:id]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
