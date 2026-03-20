"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import type { RouterOutputs } from "@/trpc/react"

type Recipe = RouterOutputs["recipe"]["getAll"][number]

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; emoji: string; accent: string; bg: string }> = {
  VEGETARIAN: { label: "Vegetariana", emoji: "🥬", accent: "#4caf50", bg: "#f1f8f1" },
  MEAT:       { label: "Carnes",      emoji: "🥩", accent: "#e53935", bg: "#fdf3f3" },
  SEAFOOD:    { label: "Mariscos",    emoji: "🐟", accent: "#1e88e5", bg: "#f0f5fd" },
  ITALIAN:    { label: "Italiana",    emoji: "🍝", accent: "#fb8c00", bg: "#fdf6ee" },
  MEXICAN:    { label: "Mexicana",    emoji: "🌮", accent: "#f9a825", bg: "#fdfaee" },
  INDIAN:     { label: "India",       emoji: "🍛", accent: "#e67e22", bg: "#fdf4ec" },
  FRENCH:     { label: "Francesa",    emoji: "🥖", accent: "#8e44ad", bg: "#f7f1fb" },
  ASIAN:      { label: "Asiática",    emoji: "🥢", accent: "#c0392b", bg: "#fdf2f2" },
  DESSERT:    { label: "Postre",      emoji: "🍰", accent: "#e91e63", bg: "#fdf0f5" },
  BREAKFAST:  { label: "Desayuno",    emoji: "🥞", accent: "#ff9800", bg: "#fdf6ed" },
  SNACK:      { label: "Snack",       emoji: "🍿", accent: "#00acc1", bg: "#edf9fb" },
  OTHER:      { label: "Otra",        emoji: "🍽️", accent: "#78909c", bg: "#f4f6f7" },
}

const DEFAULT_META = { label: "Sin categoría", emoji: "🍽️", accent: "#b0976b", bg: "#fdf8f0" }

const SORT_OPTIONS = [
  { value: "category", label: "Categoría"       },
  { value: "kcal",     label: "Calorías"         },
  { value: "recent",   label: "Más recientes"    },
  { value: "name",     label: "Nombre A→Z"       },
  { value: "cost",     label: "Costo por porción" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const proteinKcal = protein * 4
  const carbsKcal   = carbs   * 4
  const fatKcal     = fat     * 9
  const total       = proteinKcal + carbsKcal + fatKcal || 1

  const pP = (proteinKcal / total) * 100
  const pC = (carbsKcal   / total) * 100
  const pF = (fatKcal     / total) * 100

  return (
    <div className="space-y-1">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div style={{ width: `${pP}%` }} className="bg-blue-400 transition-all" />
        <div style={{ width: `${pC}%` }} className="bg-amber-400 transition-all" />
        <div style={{ width: `${pF}%` }} className="bg-rose-400 transition-all" />
      </div>
      <div className="flex justify-between text-[10px] font-medium text-gray-400">
        <span className="text-blue-500">P {pP.toFixed(0)}%</span>
        <span className="text-amber-500">C {pC.toFixed(0)}%</span>
        <span className="text-rose-400">G {pF.toFixed(0)}%</span>
      </div>
    </div>
  )
}

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      {label}
    </span>
  )
}

function getTags(recipe: Recipe) {
  const tags: string[] = []
  if (recipe.isVegan)       tags.push("🌱 Vegana")
  if (recipe.isVegetarian)  tags.push("🥬 Vegetariana")
  if (recipe.isHealthy)     tags.push("💚 Saludable")
  if (recipe.isLowCarb)     tags.push("🥗 Low carb")
  if (recipe.isSpicy)       tags.push("🌶️ Picante")
  if (recipe.isQuickMeal)   tags.push("⚡ Rápida")
  if (recipe.isPrivate)     tags.push("🔒 Privada")
  return tags
}

// ─── Recipe Detail Modal ──────────────────────────────────────────────────────

function RecipeDetailModal({
  recipe,
  onClose,
  onDelete,
  onEdit,
}: {
  recipe: Recipe
  onClose: () => void
  onDelete: (id: string) => void
  onEdit:   (id: string) => void
}) {
  const [tab, setTab] = useState<"nutrition" | "ingredients" | "steps">("nutrition")
  const meta = CATEGORY_META[recipe.category ?? ""] ?? DEFAULT_META
  const tags = getTags(recipe)
  const ps   = recipe.nutrition.perServing
  const tot  = recipe.nutrition.total

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        style={{ maxHeight: "92vh" }}
      >
        {/* ── Hero strip ── */}
        <div
          className="relative flex-shrink-0 px-6 pb-5 pt-6"
          style={{ background: `linear-gradient(135deg, ${meta.accent}22, ${meta.accent}11)`, borderBottom: `3px solid ${meta.accent}33` }}
        >
          {/* drag handle (mobile) */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-500 shadow hover:bg-white"
          >
            ✕
          </button>

          <div className="flex items-start gap-4">
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt={recipe.name} className="h-20 w-20 rounded-2xl object-cover shadow-md flex-shrink-0" />
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl text-5xl shadow-md"
                style={{ background: meta.bg }}>
                {meta.emoji}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{ background: meta.accent }}>
                  {meta.emoji} {meta.label}
                </span>
                {tags.slice(0, 3).map((t) => <Tag key={t} label={t} />)}
              </div>
              <h2 className="mt-1.5 text-xl font-bold text-gray-900 leading-tight">{recipe.name}</h2>
              {recipe.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{recipe.description}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                <span>🍽️ {recipe.baseServings} porción{recipe.baseServings !== 1 ? "es" : ""}</span>
                <span>·</span>
                <span>⚖️ {recipe.nutrition.totalWeightG}g total</span>
                {recipe.cost.totalCost > 0 && (
                  <>
                    <span>·</span>
                    <span>💰 ${recipe.cost.costPerServing.toLocaleString("es-CO")}/p</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Macro summary row */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: "Kcal",  value: ps.kcal.toFixed(0),         color: "from-orange-400 to-red-400"   },
              { label: "Prot",  value: `${ps.proteinG.toFixed(1)}g`, color: "from-blue-400 to-blue-500"  },
              { label: "Carbs", value: `${ps.carbsG.toFixed(1)}g`,   color: "from-amber-400 to-yellow-400"},
              { label: "Grasa", value: `${ps.fatG.toFixed(1)}g`,     color: "from-rose-400 to-pink-400"  },
            ].map((n) => (
              <div key={n.label}
                className={`rounded-xl bg-gradient-to-br ${n.color} p-2.5 text-center text-white shadow-sm`}>
                <div className="text-base font-bold leading-none">{n.value}</div>
                <div className="mt-0.5 text-[10px] font-medium opacity-80">{n.label}</div>
              </div>
            ))}
          </div>

          {/* Macro bar */}
          <div className="mt-3">
            <MacroBar protein={ps.proteinG} carbs={ps.carbsG} fat={ps.fatG} />
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {(["nutrition", "ingredients", "steps"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === t
                  ? "border-b-2 text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              style={tab === t ? { borderColor: meta.accent } : {}}>
              { t === "nutrition"   ? "📊 Nutrición"
              : t === "ingredients" ? "🧺 Ingredientes"
              :                       "👨‍🍳 Preparación" }
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto p-5">

          {tab === "nutrition" && (
            <div className="space-y-4">
              {/* Per serving vs total toggle */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: "Por porción",   data: ps  },
                  { title: "Receta total",  data: tot },
                ].map(({ title, data }) => (
                  <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">{title}</p>
                    <div className="space-y-2">
                      {[
                        { label: "Calorías", value: `${data.kcal.toFixed(0)} kcal`, bar: null        },
                        { label: "Proteína", value: `${data.proteinG.toFixed(1)}g`,  bar: "bg-blue-400" },
                        { label: "Carbos",   value: `${data.carbsG.toFixed(1)}g`,    bar: "bg-amber-400"},
                        { label: "Grasa",    value: `${data.fatG.toFixed(1)}g`,      bar: "bg-rose-400" },
                        { label: "Fibra",    value: `${data.fiberG.toFixed(1)}g`,    bar: "bg-green-400"},
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-2">
                          <span className="w-20 text-xs text-gray-500 flex-shrink-0">{row.label}</span>
                          {row.bar && (
                            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div className={`h-full rounded-full ${row.bar}`}
                                style={{ width: `${Math.min(100, (parseFloat(row.value) / 100) * 100)}%` }} />
                            </div>
                          )}
                          <span className="text-xs font-bold text-gray-700 flex-shrink-0">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost breakdown */}
              {recipe.cost.totalCost > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-600">💰 Costo estimado</p>
                  <div className="flex justify-between">
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-700">
                        ${recipe.cost.totalCost.toLocaleString("es-CO")}
                      </div>
                      <div className="text-xs text-amber-500">Receta completa</div>
                    </div>
                    <div className="h-10 w-px bg-amber-200" />
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-700">
                        ${recipe.cost.costPerServing.toLocaleString("es-CO")}
                      </div>
                      <div className="text-xs text-amber-500">Por porción</div>
                    </div>
                  </div>
                </div>
              )}

              {/* All tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => <Tag key={t} label={t} />)}
                </div>
              )}
            </div>
          )}

          {tab === "ingredients" && (
            <div className="space-y-2">
              {recipe.ingredients.map((item) => {
                const factor = item.gramsInBase / 100
                const kcal   = (item.ingredient.kcalPer100g    * factor).toFixed(0)
                const prot   = (item.ingredient.proteinPer100g * factor).toFixed(1)

                return (
                  <div key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 transition-colors hover:bg-amber-50">
                    <span className="text-2xl flex-shrink-0">
                      {item.ingredient.emoji ?? "🥄"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {item.ingredient.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {kcal} kcal · {prot}g prot
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-bold text-gray-700">{item.gramsInBase}g</div>
                      <div className="text-xs text-gray-400">
                        {(item.gramsInBase / recipe.baseServings).toFixed(0)}g/p
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === "steps" && (
            <div>
              {recipe.steps ? (
                <div className="space-y-3">
                  {recipe.steps.split("\n").filter(Boolean).map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step.replace(/^\d+\.\s*/, "")}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 text-center text-gray-400">
                  <span className="text-4xl">📝</span>
                  <p className="mt-2 text-sm">Sin pasos de preparación</p>
                  <button onClick={() => onEdit(recipe.id)}
                    className="mt-3 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-200">
                    Agregar pasos
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Actions footer ── */}
        <div className="flex gap-3 border-t border-gray-100 p-4 flex-shrink-0">
          <button
            onClick={() => { onEdit(recipe.id); onClose() }}
            className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => onDelete(recipe.id)}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-100 transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  const meta = CATEGORY_META[recipe.category ?? ""] ?? DEFAULT_META
  const ps   = recipe.nutrition.perServing
  const tags = getTags(recipe)

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-2"
      style={{ "--ring-color": meta.accent } as React.CSSProperties}
    >
      {/* Color accent top bar */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${meta.accent}, ${meta.accent}88)` }} />

      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start gap-3">
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.name}
              className="h-14 w-14 flex-shrink-0 rounded-xl object-cover shadow" />
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-3xl shadow-sm"
              style={{ background: meta.bg }}>
              {meta.emoji}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ background: meta.accent }}>
              {meta.label}
            </span>
            <h3 className="truncate text-sm font-bold text-gray-900 leading-tight">{recipe.name}</h3>
            <p className="text-xs text-gray-400">
              {recipe.baseServings} porción{recipe.baseServings !== 1 ? "es" : ""} · {recipe.nutrition.totalWeightG}g
            </p>
          </div>
        </div>

        {/* Kcal highlight */}
        <div className="mb-3 flex items-end justify-between">
          <div>
            <span className="text-2xl font-black text-gray-900">{ps.kcal.toFixed(0)}</span>
            <span className="ml-1 text-xs text-gray-400 font-medium">kcal / porción</span>
          </div>
          {recipe.cost.costPerServing > 0 && (
            <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
              ${recipe.cost.costPerServing.toLocaleString("es-CO")}/p
            </span>
          )}
        </div>

        {/* Macro pills */}
        <div className="mb-3 flex gap-1.5">
          <span className="flex-1 rounded-lg bg-blue-50 py-1 text-center text-xs font-bold text-blue-600">
            P {ps.proteinG.toFixed(0)}g
          </span>
          <span className="flex-1 rounded-lg bg-amber-50 py-1 text-center text-xs font-bold text-amber-600">
            C {ps.carbsG.toFixed(0)}g
          </span>
          <span className="flex-1 rounded-lg bg-rose-50 py-1 text-center text-xs font-bold text-rose-500">
            G {ps.fatG.toFixed(0)}g
          </span>
        </div>

        {/* Macro bar */}
        <MacroBar protein={ps.proteinG} carbs={ps.carbsG} fat={ps.fatG} />

        {/* Tags (max 2) */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.slice(0, 2).map((t) => <Tag key={t} label={t} />)}
            {tags.length > 2 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover cue */}
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 opacity-0 transition-all group-hover:bg-black/5 group-hover:opacity-100">
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow opacity-0 group-hover:opacity-100 transition-opacity">
          Ver detalle →
        </span>
      </div>
    </button>
  )
}

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({
  name,
  onConfirm,
  onCancel,
}: {
  name: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">🗑️</div>
        <h3 className="text-lg font-bold text-gray-900">Eliminar receta</h3>
        <p className="mt-1 text-sm text-gray-500">
          ¿Eliminar <span className="font-semibold text-gray-800">"{name}"</span>? Esta acción no se puede deshacer.
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Recipe Library ───────────────────────────────────────────────────────────

export default function RecipeLibrary() {
  const router = useRouter()
  const utils  = api.useUtils()

  const { data: recipes = [], isLoading } = api.recipe.getAll.useQuery()

  const [search,     setSearch]     = useState("")
  const [sortBy,     setSortBy]     = useState("category")
  const [filterCat,  setFilterCat]  = useState<string | null>(null)
  const [selected,   setSelected]   = useState<Recipe | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null)

  const deleteRecipe = api.recipe.delete.useMutation({
    onSuccess: () => {
      void utils.recipe.getAll.invalidate()
      toast.success("Receta eliminada")
      setDeleteTarget(null)
      setSelected(null)
    },
    onError: () => toast.error("Error al eliminar"),
  })

  // ─── Derived data ──────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = [...new Set(recipes.map((r) => r.category ?? "OTHER"))]
    return cats.sort()
  }, [recipes])

  const filtered = useMemo(() => {
    let list = recipes

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.ingredient.name.toLowerCase().includes(q))
      )
    }

    if (filterCat) {
      list = list.filter((r) => (r.category ?? "OTHER") === filterCat)
    }

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "kcal":     return b.nutrition.perServing.kcal - a.nutrition.perServing.kcal
        case "recent":   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "name":     return a.name.localeCompare(b.name)
        case "cost":     return a.cost.costPerServing - b.cost.costPerServing
        case "category": return (a.category ?? "OTHER").localeCompare(b.category ?? "OTHER")
        default:         return 0
      }
    })
  }, [recipes, search, filterCat, sortBy])

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-amber-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-amber-100" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">📚 Mi Biblioteca</h1>
            <p className="text-sm text-gray-500">
              {recipes.length} receta{recipes.length !== 1 ? "s" : ""} guardadas
            </p>
          </div>
          <button
            onClick={() => router.push("/recipe")}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:from-amber-600 hover:to-orange-600 transition-all"
          >
            + Nueva receta
          </button>
        </div>

        {/* Search + Sort */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Category filter chips */}
        {categories.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCat(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                !filterCat ? "bg-gray-800 text-white shadow" : "bg-white text-gray-500 hover:bg-gray-100"
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => {
              const m = CATEGORY_META[cat] ?? DEFAULT_META
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCat(filterCat === cat ? null : cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    filterCat === cat ? "text-white shadow" : "bg-white text-gray-600 hover:opacity-80"
                  }`}
                  style={filterCat === cat ? { background: m.accent } : { border: `1.5px solid ${m.accent}55` }}
                >
                  {m.emoji} {m.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <span className="text-6xl">🍽️</span>
            <h3 className="mt-4 text-lg font-bold text-gray-700">
              {search ? "Sin resultados" : "Aún no tienes recetas"}
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              {search ? `No hay recetas que coincidan con "${search}"` : "Crea tu primera receta para comenzar"}
            </p>
            {!search && (
              <button
                onClick={() => router.push("/recipes/new")}
                className="mt-5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600"
              >
                + Crear receta
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelected(recipe)}
            />
          ))}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <RecipeDetailModal
          recipe={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => {
            setSelected(null)
            setDeleteTarget(recipes.find((r) => r.id === id) ?? null)
          }}
          onEdit={(id) => router.push(`/recipes/${id}/edit`)}
        />
      )}

      {/* Confirm delete */}
      {deleteTarget && (
        <ConfirmDeleteModal
          name={deleteTarget.name}
          onConfirm={() => deleteRecipe.mutate({ recipeId: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
