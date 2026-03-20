import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { DailyEnergyService } from "@/server/services/daily-energy.service"
import { z } from "zod"

const logWeightSchema = z.object({
  date: z.coerce.date(),
  weightKg: z.number().positive(),
})

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * POST /api/v1/weight-logs
 *
 * Registra el peso real y dispara el loop de adaptación metabólica.
 * Este endpoint es el más importante del sistema adaptativo.
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body: unknown = await req.json()
    const parsed = logWeightSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const result = await DailyEnergyService.applyMetabolicAdaptation(
      userId,
      parsed.data.weightKg,
      parsed.data.date
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("[POST /api/v1/weight-logs]", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
