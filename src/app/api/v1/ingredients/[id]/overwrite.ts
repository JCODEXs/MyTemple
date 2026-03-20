/**
 * DELETE /api/v1/ingredients/:id/override
 * Elimina el override — precio y estado vuelven al valor del seed.
 */
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await IngredientService.resetOverride(userId, params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/v1/ingredients/:id/override]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}