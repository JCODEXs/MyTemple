"use client"

import { useMemo } from "react"
import type { RouterOutputs } from "@/trpc/react"

type IngredientItem = RouterOutputs["ingredient"]["getActive"][number]

interface RecipeIngredientCardProps {
  ingredientId: string
  ingredient: IngredientItem
  gramsInBase: number
  onRemove: (ingredientId: string) => void
  onChangeGrams: (ingredientId: string, newGrams: number) => void
  step?: number
}

export default function RecipeIngredientCard({
  ingredientId,
  ingredient,
  gramsInBase,
  onRemove,
  onChangeGrams,
  step = 10,
}: RecipeIngredientCardProps) {
  const nutrition = useMemo(() => {
    const factor = gramsInBase / 100
    return {
      kcal:    (ingredient.kcalPer100g    * factor),
      protein: (ingredient.proteinPer100g * factor),
      carbs:   (ingredient.carbsPer100g   * factor),
      fat:     (ingredient.fatPer100g     * factor),
    }
  }, [ingredient, gramsInBase])

  return (
    <div className="group relative flex flex-col items-center">
      {/* Remove button */}
      <button
        onClick={() => onRemove(ingredientId)}
        className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white opacity-0 shadow transition-all group-hover:opacity-100 hover:bg-red-600 active:scale-90"
        title="Quitar ingrediente"
      >
        ×
      </button>

      {/* Circle card */}
      <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md transition-shadow group-hover:shadow-lg overflow-hidden">
        {/* Emoji background */}
        <span
          aria-hidden
          className="pointer-events-none absolute select-none text-6xl opacity-20"
        >
          {ingredient.emoji ?? "🥄"}
        </span>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center px-2">
          <span className="mb-1 text-center text-xs font-semibold leading-tight text-gray-800 line-clamp-2">
            {ingredient.name}
          </span>

          {/* +/- controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onChangeGrams(ingredientId, Math.max(step, gramsInBase - step))}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-800 hover:bg-amber-300 active:scale-90 transition-all"
            >
              −
            </button>
            <div className="text-center">
              <div className="text-sm font-bold text-gray-800 leading-none">
                {gramsInBase}
              </div>
              <div className="text-xs text-gray-500">g</div>
            </div>
            <button
              onClick={() => onChangeGrams(ingredientId, gramsInBase + step)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-800 hover:bg-amber-300 active:scale-90 transition-all"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Nutrition pill below circle */}
      <div className="mt-1.5 flex gap-1">
        <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-semibold text-orange-700">
          {nutrition.kcal.toFixed(0)}
        </span>
        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
          P{nutrition.protein.toFixed(0)}
        </span>
        <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-semibold text-yellow-700">
          C{nutrition.carbs.toFixed(0)}
        </span>
      </div>
    </div>
  )
}
