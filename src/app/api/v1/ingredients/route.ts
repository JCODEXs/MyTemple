// ─────────────────────────────────────────────────────────────────────────────
// src/app/api/v1/ingredients/route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { IngredientService } from "@/server/services/ingredient.service"
import { z } from "zod"

async function getUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * GET /api/v1/ingredients
 *
 * Query params:
 *   (ninguno)         → catálogo completo con overrides del usuario
 *   ?active=true      → solo ingredientes activos (para motor de recetas)
 */
export async function GET(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const onlyActive = req.nextUrl.searchParams.get("active") === "true"
    const data = onlyActive
      ? await IngredientService.getActiveForUser(userId)
      : await IngredientService.getCatalogForUser(userId)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[GET /api/v1/ingredients]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
