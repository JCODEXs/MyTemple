/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
"use client"

import { useState, useMemo } from "react"
import { useRouter }         from "next/navigation"
import { toast }             from "sonner"
import { api }               from "@/trpc/react"
import type { RouterOutputs } from "@/trpc/react"

// ─── Types ────────────────────────────────────────────────────────────────────

type CommunityRecipe = RouterOutputs["recipe"]["getCommunityRecipes"][number]

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  DESAYUNO:     { label: "Desayunos",    emoji: "🌅", color: "bg-amber-500/20 text-amber-400   border-amber-500/30"  },
  ALMUERZO:     { label: "Almuerzos",    emoji: "☀️", color: "bg-orange-500/20 text-orange-400  border-orange-500/30" },
  PROTEICO:     { label: "Proteico",     emoji: "💪", color: "bg-blue-500/20   text-blue-400    border-blue-500/30"   },
  CENA:         { label: "Cenas",        emoji: "🌙", color: "bg-indigo-500/20 text-indigo-400  border-indigo-500/30" },
  BATIDO:       { label: "Batidos",      emoji: "🥤", color: "bg-cyan-500/20   text-cyan-400    border-cyan-500/30"   },
  SNACK:        { label: "Snacks",       emoji: "🍎", color: "bg-green-500/20  text-green-400   border-green-500/30"  },
  RAPIDO:       { label: "Rápido",       emoji: "⚡", color: "bg-yellow-500/20 text-yellow-400  border-yellow-500/30" },
  VEGETARIANO:  { label: "Vegetariano",  emoji: "🌿", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"},
  MEAL_PREP:    { label: "Meal Prep",    emoji: "📦", color: "bg-purple-500/20 text-purple-400  border-purple-500/30" },
}

const TAG_FILTERS = [
  { key: "isHealthy",    label: "Saludable",  emoji: "💚" },
  { key: "isHighProtein",label: "Alto proteína", emoji: "💪" },
  { key: "isLowCarb",    label: "Bajo carbs", emoji: "⚡" },
  { key: "isVegan",      label: "Vegano",     emoji: "🌱" },
  { key: "isVegetarian", label: "Vegetariano",emoji: "🥦" },
  { key: "isQuickMeal",  label: "Rápido",     emoji: "⏱" },
] as const

// ─── Macro bar ────────────────────────────────────────────────────────────────

function MacroBar({
  proteinG, carbsG, fatG,
}: { proteinG: number; carbsG: number; fatG: number }) {
  const total = (proteinG * 4 + carbsG * 4 + fatG * 9) || 1
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div style={{ width: `${(proteinG * 4 / total) * 100}%` }} className="bg-blue-400"  />
      <div style={{ width: `${(carbsG   * 4 / total) * 100}%` }} className="bg-amber-400" />
      <div style={{ width: `${(fatG     * 9 / total) * 100}%` }} className="bg-rose-400"  />
    </div>
  )
}

// ─── Recipe card ──────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  isImported,
  isImporting,
  onPreview,
  onImport,
  onCustomize,
}: {
  recipe:      CommunityRecipe
  isImported:  boolean
  isImporting: boolean
  onPreview:   (r: CommunityRecipe) => void
  onImport:    (r: CommunityRecipe) => void
  onCustomize: (r: CommunityRecipe) => void
}) {
  const meta    = CATEGORY_META[recipe.category ?? ""] ?? { label: recipe.category ?? "", emoji: "🍽️", color: "bg-white/10 text-gray-400 border-white/10" }
  const ps      = recipe.nutrition.perServing
  const kcal    = Math.round(ps.kcal)

  // Accent color based on kcal
  const accentColor = kcal < 300 ? "#34d399"
    : kcal < 500  ? "#fbbf24"
    : kcal < 700  ? "#f97316"
    : "#f87171"

  return (
    <div className="group relative flex flex-col rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden hover:ring-white/20 transition-all">
      {/* Image or emoji header */}
      <div className="relative h-32 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, #0c0c1000 100%)` }}>
        {recipe.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={recipe.imageUrl} alt={recipe.name}
            className="h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl opacity-60">
            {meta.emoji}
          </div>
        )}
        {/* Category badge */}
        <div className={`absolute top-2 left-2 rounded-full border px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm ${meta.color}`}>
          {meta.emoji} {meta.label}
        </div>
        {/* Imported badge */}
        {isImported && (
          <div className="absolute top-2 right-2 rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            ✓ Guardada
          </div>
        )}
        {/* Kcal hero */}
        <div className="absolute bottom-2 right-2 rounded-xl bg-black/60 px-2.5 py-1 backdrop-blur-sm">
          <p className="font-black text-sm leading-none" style={{ color: accentColor }}>
            {kcal}
          </p>
          <p className="text-[9px] text-gray-400">kcal</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 gap-3">
        <div>
          <h3 className="font-black text-white text-sm leading-tight">{recipe.name}</h3>
          {recipe.description && (
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {recipe.description}
            </p>
          )}
        </div>

        {/* Macros */}
        <div className="space-y-1.5">
          <MacroBar proteinG={ps.proteinG} carbsG={ps.carbsG} fatG={ps.fatG} />
          <div className="flex justify-between text-[10px]">
            <span className="text-blue-400">P {ps.proteinG.toFixed(0)}g</span>
            <span className="text-amber-400">C {ps.carbsG.toFixed(0)}g</span>
            <span className="text-rose-400">G {ps.fatG.toFixed(0)}g</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {recipe.isHealthy    && <span className="rounded-full bg-green-500/20  text-green-400  text-[9px] px-1.5 py-0.5">💚 Saludable</span>}
          {recipe.isLowCarb    && <span className="rounded-full bg-amber-500/20  text-amber-400  text-[9px] px-1.5 py-0.5">⚡ Bajo carbs</span>}
          {recipe.isVegan      && <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5">🌱 Vegano</span>}
          {recipe.isQuickMeal  && <span className="rounded-full bg-yellow-500/20 text-yellow-400  text-[9px] px-1.5 py-0.5">⏱ Rápido</span>}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <button onClick={() => onPreview(recipe)}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            👁 Ver
          </button>

          {isImported ? (
            <button onClick={() => onCustomize(recipe)}
              className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors">
              ✏️ Personalizar
            </button>
          ) : (
            <>
              <button
                onClick={() => onImport(recipe)}
                disabled={isImporting}
                className="flex-1 rounded-xl bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
                {isImporting ? "..." : "⬇️ Guardar"}
              </button>
              <button onClick={() => onCustomize(recipe)}
                className="rounded-xl bg-white/5 px-3 py-2 text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Guardar y personalizar">
                ✏️
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({
  recipe,
  isImported,
  isImporting,
  onClose,
  onImport,
  onCustomize,
}: {
  recipe:      CommunityRecipe
  isImported:  boolean
  isImporting: boolean
  onClose:     () => void
  onImport:    (r: CommunityRecipe) => void
  onCustomize: (r: CommunityRecipe) => void
}) {
  const [tab, setTab] = useState<"nutrition" | "ingredients" | "steps">("nutrition")
  const ps   = recipe.nutrition.perServing
  const meta = CATEGORY_META[recipe.category ?? ""] ?? { label: "", emoji: "🍽️", color: "" }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-lg rounded-t-3xl bg-[#0c0c10] shadow-2xl ring-1 ring-white/10 sm:rounded-3xl overflow-hidden"
        style={{ maxHeight: "92vh" }}>

        {/* Image header */}
        <div className="relative h-40 overflow-hidden">
          {recipe.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={recipe.imageUrl} alt={recipe.name}
              className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-500/10 to-orange-500/5 text-7xl opacity-50">
              {meta.emoji}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c10] via-transparent to-transparent" />
          <button onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80">
            ✕
          </button>
          {isImported && (
            <div className="absolute top-3 left-3 rounded-full bg-green-500/90 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
              ✓ Ya está en tus recetas
            </div>
          )}
        </div>

        {/* Header info */}
        <div className="px-5 pb-3 -mt-4 relative">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
            {meta.emoji} {meta.label}
          </span>
          <h2 className="mt-2 text-xl font-black text-white">{recipe.name}</h2>
          {recipe.description && (
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">{recipe.description}</p>
          )}

          {/* Kcal hero row */}
          <div className="mt-3 flex gap-3">
            {[
              { label: "Kcal",    value: Math.round(ps.kcal).toString(),       color: "text-orange-400" },
              { label: "Proteína", value: `${ps.proteinG.toFixed(0)}g`,         color: "text-blue-400"   },
              { label: "Carbs",   value: `${ps.carbsG.toFixed(0)}g`,            color: "text-amber-400"  },
              { label: "Grasa",   value: `${ps.fatG.toFixed(0)}g`,              color: "text-rose-400"   },
            ].map((s) => (
              <div key={s.label} className="flex-1 rounded-xl bg-white/5 p-2.5 text-center">
                <p className={`text-base font-black leading-none ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-5 gap-1">
          {(["nutrition", "ingredients", "steps"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-2 px-2 text-xs font-bold capitalize transition-all border-b-2 ${
                tab === t ? "border-amber-500 text-amber-400" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}>
              {t === "nutrition"   ? "Nutrición"
               : t === "ingredients" ? "Ingredientes"
               : "Preparación"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto p-5" style={{ maxHeight: "35vh" }}>
          {tab === "nutrition" && (
            <div className="space-y-3">
              <MacroBar proteinG={ps.proteinG} carbsG={ps.carbsG} fatG={ps.fatG} />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Calorías",  value: `${Math.round(ps.kcal)} kcal`,     color: "text-orange-400" },
                  { label: "Proteína",  value: `${ps.proteinG.toFixed(1)}g`,       color: "text-blue-400"   },
                  { label: "Carbs",     value: `${ps.carbsG.toFixed(1)}g`,         color: "text-amber-400"  },
                  { label: "Grasa",     value: `${ps.fatG.toFixed(1)}g`,           color: "text-rose-400"   },
                  { label: "Fibra",     value: ps.fiberG ? `${ps.fiberG.toFixed(1)}g` : "—", color: "text-green-400" },
                  { label: "Porciones", value: recipe.baseServings.toString(),     color: "text-white"      },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between rounded-xl bg-white/5 px-3 py-2">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
              {recipe.cost && (
                <div className="rounded-xl bg-white/5 px-3 py-2 flex justify-between">
                  <span className="text-xs text-gray-500">💰 Costo estimado</span>
                  <span className="text-xs font-bold text-white">
                    ${recipe.cost.costPerServing.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP/porción
                  </span>
                </div>
              )}
            </div>
          )}

          {tab === "ingredients" && (
            <div className="space-y-2">
              {recipe.ingredients.map((ri) => (
                <div key={ri.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{ri.ingredient.emoji ?? "🥄"}</span>
                    <span className="text-sm text-gray-300">{ri.ingredient.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white">{ri.gramsInBase}g</span>
                    <p className="text-[10px] text-gray-600">
                      {Math.round(ri.ingredient.kcalPer100g * ri.gramsInBase / 100)} kcal
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "steps" && (
            <div className="space-y-3">
              {recipe.steps ? (
                recipe.steps.split("\n").filter(Boolean).map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center">
                      {i + 1}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed pt-0.5">
                      {step.replace(/^\d+\.\s*/, "")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 text-center py-4">Sin pasos registrados</p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-white/10 flex gap-3">
          {isImported ? (
            <>
              <button onClick={onClose}
                className="flex-1 rounded-2xl border border-white/10 py-3 text-sm text-gray-400 hover:bg-white/5">
                Cerrar
              </button>
              <button onClick={() => { onCustomize(recipe); onClose() }}
                className="flex-1 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600">
                ✏️ Personalizar copia
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { onImport(recipe); onClose() }}
                disabled={isImporting}
                className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50">
                ⬇️ Guardar en mis recetas
              </button>
              <button onClick={() => { onCustomize(recipe); onClose() }}
                className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-400 hover:bg-amber-500/20">
                ✏️
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RecipeImportPageComponent() {
  const router = useRouter()
  const utils  = api.useUtils()

  const [search,        setSearch]        = useState("")
  const [selectedCat,   setSelectedCat]   = useState<string | null>(null)
  const [activeTags,    setActiveTags]     = useState<Set<string>>(new Set())
  const [previewRecipe, setPreviewRecipe]  = useState<CommunityRecipe | null>(null)
  const [importingIds,  setImportingIds]   = useState<Set<string>>(new Set())

  // ── Data ───────────────────────────────────────────────────────────────────

  const { data: communityRecipes = [], isLoading } =
    api.recipe.getCommunityRecipes.useQuery(undefined, { staleTime: 10 * 60_000 })

  const { data: myRecipes = [] } =
    api.recipe.getAll.useQuery(undefined, { staleTime: 5 * 60_000 })

  // Set of sourceRecipeIds I've already imported
  const importedSourceIds = useMemo(
    () => new Set(myRecipes.map((r) => r.sourceRecipeId).filter(Boolean) as string[]),
    [myRecipes]
  )

  // ── Import mutation ────────────────────────────────────────────────────────

  const importRecipe = api.recipe.importFromCommunity.useMutation({
    onSuccess: (data) => {
      void utils.recipe.getAll.invalidate()
      toast.success(`"${data.name}" guardada en tus recetas ✓`)
      setImportingIds((prev) => { const next = new Set(prev); next.delete(data.sourceRecipeId as string ?? ""); return next })
    },
    onError: (e) => {
      toast.error(e.message)
      setImportingIds(new Set())
    },
  })

  const handleImport = (recipe: CommunityRecipe) => {
    setImportingIds((prev) => new Set(prev).add(recipe.id))
    importRecipe.mutate({ sourceRecipeId: recipe.id })
  }

  const handleCustomize = (recipe: CommunityRecipe) => {
    // Import first (if not already) then go to editor
    if (!importedSourceIds.has(recipe.id)) {
      importRecipe.mutate(
        { sourceRecipeId: recipe.id },
        {
          onSuccess: (data) => {
            void utils.recipe.getAll.invalidate()
            router.push(`/recipes/${data.id}/edit`)
          },
        }
      )
    } else {
      // Find the already-imported copy and go to edit
      const myVersion = myRecipes.find((r) => r.sourceRecipeId === recipe.id)
      if (myVersion) router.push(`/recipes/${myVersion.id}/edit`)
    }
  }

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev)
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return communityRecipes.filter((r) => {
      if (selectedCat && r.category !== selectedCat) return false
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
          !r.description?.toLowerCase().includes(search.toLowerCase())) return false
      for (const tag of activeTags) {
        if (!(r as Record<string, unknown>)[tag]) return false
      }
      return true
    })
  }, [communityRecipes, selectedCat, search, activeTags])

  // Available categories in the loaded data
  const availableCategories = useMemo(
    () => [...new Set(communityRecipes.map((r) => r.category).filter(Boolean) as string[])],
    [communityRecipes]
  )

  // ── Stats ──────────────────────────────────────────────────────────────────

  const importedCount = myRecipes.filter((r) => r.sourceRecipeId).length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">
              🌍 Recetas de la comunidad
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {communityRecipes.length} recetas disponibles ·{" "}
              {importedCount > 0
                ? <span className="text-amber-400">{importedCount} guardadas en tu colección</span>
                : "Guarda las que quieras en tu colección"}
            </p>
          </div>
          <button onClick={() => router.push("/recipes")}
            className="flex-shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400 hover:bg-white/10 transition-colors">
            Mis recetas →
          </button>
        </div>

        {/* ── How it works banner ── */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: "👁", title: "Explora",    desc: "Filtra por categoría, objetivo o ingredientes"     },
            { icon: "⬇️", title: "Guarda",     desc: "Se crea una copia en tu colección, el original no cambia" },
            { icon: "✏️", title: "Personaliza", desc: "Edita ingredientes, porciones y pasos solo en tu copia" },
          ].map((s) => (
            <div key={s.title} className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{s.icon}</span>
              <div>
                <p className="text-xs font-bold text-amber-400">{s.title}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search ── */}
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none"
        />

        {/* ── Category chips ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setSelectedCat(null)}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
              !selectedCat ? "bg-amber-500 border-amber-500 text-white" : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
            }`}>
            Todas
          </button>
          {availableCategories.map((cat) => {
            const m = CATEGORY_META[cat]
            return (
              <button key={cat}
                onClick={() => setSelectedCat(selectedCat === cat ? null : cat)}
                className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedCat === cat ? `${m?.color ?? ""} border-current` : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                }`}>
                {m?.emoji} {m?.label ?? cat}
              </button>
            )
          })}
        </div>

        {/* ── Tag filters ── */}
        <div className="flex gap-2 flex-wrap">
          {TAG_FILTERS.map((t) => (
            <button key={t.key}
              onClick={() => toggleTag(t.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                activeTags.has(t.key)
                  ? "bg-white/15 border-white/30 text-white"
                  : "border-white/10 bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
              }`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* ── Results count ── */}
        <p className="text-xs text-gray-600">
          {filtered.length} receta{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
          {((selectedCat ?? activeTags.size > 0) || search) && (
            <button
              onClick={() => { setSelectedCat(null); setActiveTags(new Set()); setSearch("") }}
              className="ml-2 text-amber-400 hover:text-amber-300">
              Limpiar filtros ×
            </button>
          )}
        </p>

        {/* ── Grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-5xl mb-3">🔍</span>
            <h3 className="font-bold text-gray-400">Sin resultados</h3>
            <p className="text-sm text-gray-600 mt-1">Intenta con otros filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isImported={importedSourceIds.has(recipe.id)}
                isImporting={importingIds.has(recipe.id)}
                onPreview={setPreviewRecipe}
                onImport={handleImport}
                onCustomize={handleCustomize}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Preview modal ── */}
      {previewRecipe && (
        <PreviewModal
          recipe={previewRecipe}
          isImported={importedSourceIds.has(previewRecipe.id)}
          isImporting={importingIds.has(previewRecipe.id)}
          onClose={() => setPreviewRecipe(null)}
          onImport={handleImport}
          onCustomize={handleCustomize}
        />
      )}
    </div>
  )
}
