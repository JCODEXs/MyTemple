"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import type { RouterOutputs } from "@/trpc/react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Ingredient = RouterOutputs["ingredient"]["getCatalog"][number]

// ─── Sub-components ───────────────────────────────────────────────────────────

function NutritionalBadge({ label, value, unit, color }: {
  label: string
  value: number
  unit: string
  color: string
}) {
  return (
    <div className={`flex flex-col items-center rounded-lg px-2 py-1 ${color}`}>
      <span className="text-xs font-medium opacity-75">{label}</span>
      <span className="text-sm font-bold">{value.toFixed(1)}{unit}</span>
    </div>
  )
}

function IngredientVisual({ ingredient }: { ingredient: Ingredient }) {
  if (ingredient.imageUrl) {
    return (
      <img
        src={ingredient.imageUrl}
        alt={ingredient.name}
        className="h-16 w-16 rounded-full object-cover"
        onError={(e) => {
          // fallback a emoji si la imagen falla
          e.currentTarget.style.display = "none"
        }}
      />
    )
  }
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-4xl">
      {ingredient.emoji ?? "🥄"}
    </div>
  )
}

function IngredientCard({
  ingredient,
  onPriceSave,
  onToggleActive,
  onResetOverride,
}: {
  ingredient: Ingredient
  onPriceSave: (id: string, price: number | null) => Promise<void>
  onToggleActive: (id: string, isActive: boolean) => Promise<void>
  onResetOverride: (id: string) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showNutrition, setShowNutrition] = useState(false)
  const [priceInput, setPriceInput] = useState<string>(
    String(ingredient.customPricePerKg ?? ingredient.defaultPricePerKg ?? "")
  )

  const handleSavePrice = async () => {
    setIsLoading(true)
    const parsed = priceInput === "" ? null : Number(priceInput)
    await onPriceSave(ingredient.id, parsed)
    setIsLoading(false)
    setIsEditing(false)
  }

  const handleToggle = async () => {
    setIsLoading(true)
    await onToggleActive(ingredient.id, !ingredient.isActive)
    setIsLoading(false)
  }

  const handleReset = async () => {
    setIsLoading(true)
    await onResetOverride(ingredient.id)
    setIsLoading(false)
  }

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm transition-all ${
      !ingredient.isActive ? "opacity-50 grayscale" : "border-amber-200"
    }`}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <IngredientVisual ingredient={ingredient} />
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-semibold text-gray-900">
            {ingredient.name}
          </h3>
          {ingredient.hasOverride && (
            <span className="text-xs text-amber-600 font-medium">
              ✏️ Precio personalizado
            </span>
          )}
        </div>
        {/* Toggle activo */}
        <button
          onClick={handleToggle}
          disabled={isLoading}
          title={ingredient.isActive ? "Desactivar en motor de recetas" : "Activar en motor de recetas"}
          className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
            ingredient.isActive
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {ingredient.isActive ? "Activo" : "Inactivo"}
        </button>
      </div>

      {/* Precio */}
      <div className="mb-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">$/kg</span>
            <input
              type="number"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder={String(ingredient.defaultPricePerKg ?? "")}
              className="w-full rounded border border-amber-300 px-2 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-amber-400"
              min={0}
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-gray-800">
                ${(ingredient.effectivePrice ?? 0).toLocaleString("es-CO")}
                <span className="text-sm font-normal text-gray-500">/kg</span>
              </span>
              {ingredient.customPricePerKg !== null && ingredient.defaultPricePerKg !== null && (
                <p className="text-xs text-gray-400">
                  Default: ${ingredient.defaultPricePerKg.toLocaleString("es-CO")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info nutricional (expandible) */}
      <button
        onClick={() => setShowNutrition((v) => !v)}
        className="mb-2 w-full rounded bg-amber-50 px-2 py-1 text-left text-xs text-amber-700 hover:bg-amber-100 transition-colors"
      >
        {showNutrition ? "▲ Ocultar nutrición" : "▼ Ver info nutricional"} · por 100g
      </button>

      {showNutrition && (
        <div className="mb-3 grid grid-cols-4 gap-1">
          <NutritionalBadge
            label="Kcal"
            value={ingredient.kcalPer100g}
            unit=""
            color="bg-orange-100 text-orange-800"
          />
          <NutritionalBadge
            label="Prot"
            value={ingredient.proteinPer100g}
            unit="g"
            color="bg-blue-100 text-blue-800"
          />
          <NutritionalBadge
            label="Carbs"
            value={ingredient.carbsPer100g}
            unit="g"
            color="bg-yellow-100 text-yellow-800"
          />
          <NutritionalBadge
            label="Grasa"
            value={ingredient.fatPer100g}
            unit="g"
            color="bg-red-100 text-red-800"
          />
          {ingredient.fiberPer100g !== null && (
            <div className="col-span-4">
              <NutritionalBadge
                label="Fibra"
                value={ingredient.fiberPer100g}
                unit="g"
                color="bg-green-100 text-green-800"
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSavePrice}
              disabled={isLoading}
              className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
            >
              Editar precio
            </button>
            {ingredient.hasOverride && (
              <button
                onClick={handleReset}
                disabled={isLoading}
                title="Restablecer precio y estado por defecto"
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              >
                ↺
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IngredientManagerPanel() {
  const utils = api.useUtils()

  const { data: ingredients = [], isLoading } =
    api.ingredient.getCatalog.useQuery(
      undefined,
      { staleTime: 10 * 60_000 }  // 10 minutos — lento (las mutaciones invalidan manualmente)
    )

  const setCustomPrice = api.ingredient.setCustomPrice.useMutation({
    onSuccess: () => {
      void utils.ingredient.getCatalog.invalidate()
      toast.success("Precio actualizado")
    },
    onError: () => toast.error("Error al actualizar precio"),
  })

  const toggleActive = api.ingredient.toggleActive.useMutation({
    onSuccess: (_, vars) => {
      void utils.ingredient.getCatalog.invalidate()
      toast.success(vars.isActive ? "Ingrediente activado" : "Ingrediente desactivado")
    },
    onError: () => toast.error("Error al cambiar estado"),
  })

  const resetOverride = api.ingredient.resetOverride.useMutation({
    onSuccess: () => {
      void utils.ingredient.getCatalog.invalidate()
      toast.success("Precio restablecido al valor por defecto")
    },
    onError: () => toast.error("Error al restablecer"),
  })

  // ─── Filtros ────────────────────────────────────────────────────────────────

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "custom">("all")

  const filtered = useMemo(() => {
    return ingredients
      .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
      .filter((i) => {
        if (filter === "active") return i.isActive
        if (filter === "custom") return i.hasOverride
        return true
      })
  }, [ingredients, search, filter])

  const stats = useMemo(() => ({
    total: ingredients.length,
    active: ingredients.filter((i) => i.isActive).length,
    custom: ingredients.filter((i) => i.hasOverride).length,
  }), [ingredients])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handlePriceSave = async (id: string, price: number | null) => {
    await setCustomPrice.mutateAsync({ ingredientId: id, customPricePerKg: price })
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await toggleActive.mutateAsync({ ingredientId: id, isActive })
  }

  const handleResetOverride = async (id: string) => {
    await resetOverride.mutateAsync({ ingredientId: id })
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <p className="text-amber-700 animate-pulse">Cargando ingredientes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-amber-900">
            🧺 Gestión de Ingredientes
          </h1>
          <p className="text-amber-700">
            Personaliza precios y activa los ingredientes de tu motor de recetas
          </p>
        </header>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="rounded-xl bg-green-50 p-3 shadow-sm">
            <p className="text-2xl font-bold text-green-700">{stats.active}</p>
            <p className="text-sm text-green-600">Activos</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 shadow-sm">
            <p className="text-2xl font-bold text-amber-700">{stats.custom}</p>
            <p className="text-sm text-amber-600">Con precio personalizado</p>
          </div>
        </div>

        {/* Búsqueda y filtros */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="🔍 Buscar ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-amber-200 bg-white px-4 py-2 text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-2">
            {(["all", "active", "custom"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-amber-500 text-white shadow"
                    : "bg-white text-gray-600 hover:bg-amber-50"
                }`}
              >
                {f === "all" ? "Todos" : f === "active" ? "Activos" : "Personalizados"}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ingredient) => (
            <IngredientCard
              key={ingredient.id}
              ingredient={ingredient}
              onPriceSave={handlePriceSave}
              onToggleActive={handleToggleActive}
              onResetOverride={handleResetOverride}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-500">
            {search ? `No hay ingredientes que coincidan con "${search}"` : "No hay ingredientes registrados"}
          </div>
        )}
      </div>
    </div>
  )
}
