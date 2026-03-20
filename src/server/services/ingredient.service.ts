import { db } from "@/server/db"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IngredientWithOverride {
  id: string
  name: string
  emoji: string | null
  imageUrl: string | null
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g: number | null
  sodiumMgPer100g: number | null
  defaultPricePerKg: number | null
  // campos del override del usuario (null si no tiene override)
  customPricePerKg: number | null
  effectivePrice: number | null   // customPrice ?? defaultPrice
  isActive: boolean               // true si no hay override o isActive = true
  hasOverride: boolean
}

export interface UpsertOverrideInput {
  ingredientId: string
  customPricePerKg?: number | null
  isActive?: boolean
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const IngredientService = {
  /**
   * Catálogo completo de ingredientes con el override del usuario mezclado.
   * Incluye isActive y effectivePrice calculados.
   */
  async getCatalogForUser(userId: string): Promise<IngredientWithOverride[]> {
    const [ingredients, overrides] = await Promise.all([
      db.ingredient.findMany({ orderBy: { name: "asc" } }),
      db.userIngredientOverride.findMany({ where: { userId } }),
    ])

    const overrideMap = new Map(
      overrides.map((o) => [o.ingredientId, o])
    )

    return ingredients.map((ing) => {
      const override = overrideMap.get(ing.id) ?? null

      return {
        id: ing.id,
        name: ing.name,
        emoji: ing.emoji,
        imageUrl: ing.imageUrl,
        kcalPer100g: ing.kcalPer100g,
        proteinPer100g: ing.proteinPer100g,
        carbsPer100g: ing.carbsPer100g,
        fatPer100g: ing.fatPer100g,
        fiberPer100g: ing.fiberPer100g,
        sodiumMgPer100g: ing.sodiumMgPer100g,
        defaultPricePerKg: ing.defaultPricePerKg,
        customPricePerKg: override?.customPricePerKg ?? null,
        effectivePrice: override?.customPricePerKg ?? ing.defaultPricePerKg,
        isActive: override?.isActive ?? true,
        hasOverride: override !== null,
      }
    })
  },

  /**
   * Solo los ingredientes activos del usuario — para el motor de recetas.
   */
  async getActiveForUser(userId: string): Promise<IngredientWithOverride[]> {
    const catalog = await IngredientService.getCatalogForUser(userId)
    return catalog.filter((i) => i.isActive)
  },

  /**
   * Upsert del override de un usuario para un ingrediente.
   * Crea el registro si no existe, lo actualiza si ya existe.
   */
  async upsertOverride(
    userId: string,
    input: UpsertOverrideInput
  ) {
    const { ingredientId, customPricePerKg, isActive } = input

    return db.userIngredientOverride.upsert({
      where: {
        userId_ingredientId: { userId, ingredientId },
      },
      create: {
        userId,
        ingredientId,
        customPricePerKg: customPricePerKg ?? null,
        isActive: isActive ?? true,
      },
      update: {
        ...(customPricePerKg !== undefined && { customPricePerKg }),
        ...(isActive !== undefined && { isActive }),
      },
    })
  },

  /**
   * Activa o desactiva un ingrediente en el motor de recetas del usuario.
   */
  async toggleActive(userId: string, ingredientId: string, isActive: boolean) {
    return IngredientService.upsertOverride(userId, { ingredientId, isActive })
  },

  /**
   * Actualiza el precio personalizado de un ingrediente para el usuario.
   */
  async setCustomPrice(
    userId: string,
    ingredientId: string,
    customPricePerKg: number | null
  ) {
    return IngredientService.upsertOverride(userId, {
      ingredientId,
      customPricePerKg,
    })
  },

  /**
   * Elimina el override — el ingrediente vuelve al precio y estado por defecto.
   */
  async resetOverride(userId: string, ingredientId: string) {
    return db.userIngredientOverride.deleteMany({
      where: { userId, ingredientId },
    })
  },

  /**
   * Un ingrediente específico con su override para el usuario.
   */
  async getOne(userId: string, ingredientId: string) {
    const catalog = await IngredientService.getCatalogForUser(userId)
    return catalog.find((i) => i.id === ingredientId) ?? null
  },
}
