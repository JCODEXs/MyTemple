
// ─────────────────────────────────────────────────────────────────────────────
// src/app/api/v1/ingredients/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { IngredientService } from "@/server/services/ingredient.service"
import { z } from "zod"

async function getUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}
const overrideSchema = z.object({
  customPricePerKg: z.number().positive().nullable().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/v1/ingredients/:id
 * Un ingrediente con su override.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const ingredient = await IngredientService.getOne(userId, params.id)
    if (!ingredient) return NextResponse.json({ error: "Ingrediente no encontrado" }, { status: 404 })
    return NextResponse.json(ingredient)
  } catch (error) {
    console.error("[GET /api/v1/ingredients/:id]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/ingredients/:id
 *
 * Body (todos opcionales):
 *   { customPricePerKg: number | null, isActive: boolean }
 *
 * - customPricePerKg: null = volver al precio por defecto
 * - isActive: false = excluir del motor de recetas
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body: unknown = await req.json()
    const parsed = overrideSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 })
    }

    const result = await IngredientService.upsertOverride(userId, {
      ingredientId: params.id,
      ...parsed.data,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[PATCH /api/v1/ingredients/:id]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}


