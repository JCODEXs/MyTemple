// ─────────────────────────────────────────────────────────────────────────────
// src/app/api/v1/profile/route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { UserProfileService } from "@/server/services/user-profile.service"
import { z } from "zod"
import { Sex, GoalType } from "../../../../../generated/prisma"

const profileBaseSchema = z.object({
  age: z.number().int().min(10).max(120),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(20).max(400),
  bodyFatPct: z.number().min(3).max(70).optional(),
  sex: z.nativeEnum(Sex),
  goal: z.nativeEnum(GoalType),
  activityFactor: z.number().min(1.0).max(2.5).optional(),
})

async function getUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * GET /api/v1/profile
 * Devuelve el perfil del usuario autenticado con resumen metabólico.
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const summary = await UserProfileService.getSummary(userId)
    if (!summary) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    return NextResponse.json(summary)
  } catch (error) {
    console.error("[GET /api/v1/profile]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

/**
 * POST /api/v1/profile
 * Crea el perfil inicial. Solo se puede llamar una vez por usuario.
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body: unknown = await req.json()
    const parsed = profileBaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 })
    }

    const profile = await UserProfileService.create(userId, parsed.data)
    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    const msg = (error as Error).message
    if (msg.includes("ya existe")) {
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    console.error("[POST /api/v1/profile]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/profile
 * Actualiza campos del perfil. Si cambia weightKg, crea WeightLog automáticamente.
 */
export async function PATCH(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body: unknown = await req.json()
    const parsed = profileBaseSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 })
    }

    const profile = await UserProfileService.update(userId, parsed.data)
    return NextResponse.json(profile)
  } catch (error) {
    const msg = (error as Error).message
    if (msg.includes("no encontrado")) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    console.error("[PATCH /api/v1/profile]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
