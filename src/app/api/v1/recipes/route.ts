
// ─────────────────────────────────────────────────────────────────────────────
// src/app/api/v1/recipes/route.ts  —  REST handler (collection)
// ─────────────────────────────────────────────────────────────────────────────

import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth"

async function getUserId() {
const session = await auth()
  return session?.user?.id ?? null
}

const ingredientLineSchemaREST = z.object({
  ingredientId: z.string().cuid(),
  gramsInBase: z.number().positive(),
})

const createRecipeSchemaREST = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  steps: z.string().max(5000).optional(),
  baseServings: z.number().int().min(1).max(100),
  category: z.nativeEnum(RecipeCategory).optional(),
  isPrivate: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isHealthy: z.boolean().optional(),
  isLowCarb: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  isQuickMeal: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
  ingredients: z.array(ingredientLineSchemaREST).min(1),
})

/**
 * GET /api/v1/recipes
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const recipes = await RecipeService.getAll(userId)
    return NextResponse.json(recipes)
  } catch (error) {
    console.error("[GET /api/v1/recipes]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

/**
 * POST /api/v1/recipes
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body: unknown = await req.json()
    const parsed = createRecipeSchemaREST.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 422 }
      )
    }
    const recipe = await RecipeService.create(userId, parsed.data)
    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    const msg = (error as Error).message
    if (msg.includes("no existen")) {
      return NextResponse.json({ error: msg }, { status: 422 })
    }
    console.error("[POST /api/v1/recipes]", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
