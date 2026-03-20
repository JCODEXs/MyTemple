"use client"

import { useState } from "react"
import { api } from "@/trpc/react"
import IngredientAmountModal from "./IngredientAmountModal"
import type { RouterOutputs } from "@/trpc/react"

type IngredientItem = RouterOutputs["ingredient"]["getActive"][number]

interface ActionBoxProps {
  onAddIngredient: (ingredientId: string, gramsInBase: number) => void
}

export default function ActionBox({ onAddIngredient }: ActionBoxProps) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<IngredientItem | null>(null)

  const { data: ingredients = [], isLoading } = api.ingredient.getActive.useQuery()

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleConfirm = (ingredientId: string, gramsInBase: number) => {
    onAddIngredient(ingredientId, gramsInBase)
    setSelected(null)
  }

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 rounded-xl bg-amber-50 p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 w-14 animate-pulse rounded-lg bg-amber-200" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Buscar ingrediente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />

      {/* Grid de ingredientes */}
      <div className="flex flex-wrap gap-2 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-3 min-h-16">
        {filtered.length === 0 && (
          <p className="w-full text-center text-sm text-gray-400 py-4">
            No hay ingredientes activos. Actívalos en Gestión de Ingredientes.
          </p>
        )}
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item)}
            title={`${item.name} · ${item.kcalPer100g} kcal/100g`}
            className="group relative flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-amber-200 bg-white shadow-sm transition-all hover:scale-110 hover:border-amber-400 hover:shadow-md active:scale-95"
          >
            <span className="text-2xl leading-none">
              {item.emoji ?? "🥄"}
            </span>
            {/* Tooltip on hover */}
            <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
              {item.name}
            </div>
          </button>
        ))}
      </div>

      {/* Modal de cantidad */}
      <IngredientAmountModal
        ingredient={selected}
        onConfirm={handleConfirm}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
