"use client"


import { useState, useMemo, useEffect } from "react"
import { useRouter, useParams }          from "next/navigation"
import { UploadButton }                  from "@/utils/uploadthing"
import { toast }                         from "sonner"
import { api }                           from "@/trpc/react"
import ActionBox                         from "@/app/_components/domain/ActionBox"
import RecipeIngredientCard              from "@/app/_components/domain/RecipeIngredientCard"
import { calculateRecipeNutrition }      from "@/lib/domain/nutrition/recipe-calculator"
import type { RouterOutputs }            from "@/trpc/react"

// ─── Types ────────────────────────────────────────────────────────────────────

type IngredientItem = RouterOutputs["ingredient"]["getActive"][number]

interface RecipeIngredientDraft {
  ingredientId: string
  ingredient:   IngredientItem
  gramsInBase:  number
}

interface RecipeMeta {
  name:         string
  description:  string
  baseServings: number
  category:     string
  isPrivate:    boolean
  isVegan:      boolean
  isVegetarian: boolean
  isHealthy:    boolean
  isLowCarb:    boolean
  isSpicy:      boolean
  isQuickMeal:  boolean
  steps:        string
  imageUrl:     string
}

const CATEGORY_OPTIONS = [
  { value: "VEGETARIAN", label: "🥬 Vegetariana" },
  { value: "MEAT",       label: "🥩 Carnes"      },
  { value: "SEAFOOD",    label: "🐟 Mariscos"    },
  { value: "ITALIAN",    label: "🍝 Italiana"    },
  { value: "MEXICAN",    label: "🌮 Mexicana"    },
  { value: "INDIAN",     label: "🍛 India"       },
  { value: "FRENCH",     label: "🥖 Francesa"    },
  { value: "ASIAN",      label: "🥢 Asiática"    },
  { value: "DESSERT",    label: "🍰 Postre"      },
  { value: "BREAKFAST",  label: "🥞 Desayuno"    },
  { value: "SNACK",      label: "🍿 Snack"       },
  { value: "OTHER",      label: "🍽️ Otra"        },
]

// ─── Nutrition bar ────────────────────────────────────────────────────────────

function NutritionBar({ ingredients, servings }: {
  ingredients: RecipeIngredientDraft[]
  servings:    number
}) {
  const nutrition = useMemo(() => {
    if (ingredients.length === 0) return null
    return calculateRecipeNutrition(
      ingredients.map((i) => ({
        ingredient: {
          id:             i.ingredientId,
          name:           i.ingredient.name,
          kcalPer100g:    i.ingredient.kcalPer100g,
          proteinPer100g: i.ingredient.proteinPer100g,
          carbsPer100g:   i.ingredient.carbsPer100g,
          fatPer100g:     i.ingredient.fatPer100g,
          fiberPer100g:   i.ingredient.fiberPer100g,
        },
        gramsInBase: i.gramsInBase,
      })),
      servings
    )
  }, [ingredients, servings])

  if (!nutrition) return null
  const ps = nutrition.perServing

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-400/70">
        Nutrición por porción · vista previa en tiempo real
      </p>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Kcal",     value: ps.kcal.toFixed(0),       color: "text-orange-400" },
          { label: "Proteína", value: `${ps.proteinG.toFixed(1)}g`, color: "text-blue-400"   },
          { label: "Carbs",    value: `${ps.carbsG.toFixed(1)}g`,   color: "text-amber-400"  },
          { label: "Grasa",    value: `${ps.fatG.toFixed(1)}g`,     color: "text-rose-400"   },
        ].map((n) => (
          <div key={n.label} className="rounded-xl bg-white/5 p-3 text-center">
            <p className={`text-xl font-black leading-none ${n.color}`}>{n.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{n.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-right text-[10px] text-gray-600">
        Total: {nutrition.total.kcal.toFixed(0)} kcal · {nutrition.totalWeightG}g
      </p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function EditSkeleton() {
  return (
    <div className="min-h-screen bg-[#0c0c10] p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="h-8 w-48 rounded-xl bg-white/5 animate-pulse" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 h-96 rounded-2xl bg-white/5 animate-pulse" />
        <div className="lg:col-span-3 space-y-4">
          <div className="h-28 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-80 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id as string

  const utils = api.useUtils()

  // ── Remote data ──────────────────────────────────────────────────────────────

  const { data: recipe, isLoading: loadingRecipe, error: recipeError } =
    api.recipe.getOne.useQuery(
      { recipeId },
      { staleTime: 0 }   // always fresh when editing
    )

  const { data: activeIngredients = [] } =
    api.ingredient.getActive.useQuery(undefined, { staleTime: Infinity })

  // ── Local state ───────────────────────────────────────────────────────────────

  const [meta, setMeta] = useState<RecipeMeta>({
    name:         "",
    description:  "",
    baseServings: 1,
    category:     "",
    isPrivate:    false,
    isVegan:      false,
    isVegetarian: false,
    isHealthy:    false,
    isLowCarb:    false,
    isSpicy:      false,
    isQuickMeal:  false,
    steps:        "",
    imageUrl:     "",
  })

  const [draftIngredients, setDraftIngredients] = useState<RecipeIngredientDraft[]>([])
  const [globalStep,       setGlobalStep]       = useState(10)
  const [initialized,      setInitialized]      = useState(false)

  // ── Seed form when recipe loads ───────────────────────────────────────────────

  useEffect(() => {
    if (!recipe || initialized || activeIngredients.length === 0) return

    setMeta({
      name:         recipe.name,
      description:  recipe.description  ?? "",
      baseServings: recipe.baseServings,
      category:     recipe.category     ?? "",
      isPrivate:    recipe.isPrivate,
      isVegan:      recipe.isVegan,
      isVegetarian: recipe.isVegetarian,
      isHealthy:    recipe.isHealthy,
      isLowCarb:    recipe.isLowCarb,
      isSpicy:      recipe.isSpicy,
      isQuickMeal:  recipe.isQuickMeal,
      steps:        recipe.steps        ?? "",
      imageUrl:     recipe.imageUrl     ?? "",
    })

    // Map recipe.ingredients back to draft format
    // We need the full IngredientItem from activeIngredients catalog
    const drafts: RecipeIngredientDraft[] = []
    for (const ri of recipe.ingredients) {
      // Try to find in active catalog first
      const active = activeIngredients.find((a) => a.id === ri.ingredientId)
      if (active) {
        drafts.push({ ingredientId: ri.ingredientId, ingredient: active, gramsInBase: ri.gramsInBase })
      } else {
        // Ingredient exists in recipe but is inactive/disabled — include it anyway
        // Build a minimal IngredientItem from the recipe data
        drafts.push({
          ingredientId: ri.ingredientId,
          ingredient:   ri.ingredient as unknown as IngredientItem,
          gramsInBase:  ri.gramsInBase,
        })
      }
    }

    setDraftIngredients(drafts)
    setInitialized(true)
  }, [recipe, activeIngredients, initialized])

  // ── Mutation ──────────────────────────────────────────────────────────────────

  const updateRecipe = api.recipe.update.useMutation({
    onSuccess: (updated) => {
      void utils.recipe.getAll.invalidate()
      void utils.recipe.getOne.invalidate({ recipeId })
      toast.success(`"${updated.name}" actualizada ✓`)
      router.push("/library")
    },
    onError: (e) => toast.error(e.message),
  })

  // ── Ingredient handlers ───────────────────────────────────────────────────────

  const handleAddIngredient = (ingredientId: string, gramsInBase: number) => {
    const ingredient = activeIngredients.find((i) => i.id === ingredientId)
    if (!ingredient) return

    setDraftIngredients((prev) => {
      const existing = prev.find((i) => i.ingredientId === ingredientId)
      if (existing) {
        return prev.map((i) =>
          i.ingredientId === ingredientId
            ? { ...i, gramsInBase: i.gramsInBase + gramsInBase }
            : i
        )
      }
      return [...prev, { ingredientId, ingredient, gramsInBase }]
    })
  }

  const handleRemove = (ingredientId: string) =>
    setDraftIngredients((prev) => prev.filter((i) => i.ingredientId !== ingredientId))

  const handleChangeGrams = (ingredientId: string, newGrams: number) =>
    setDraftIngredients((prev) =>
      prev.map((i) =>
        i.ingredientId === ingredientId
          ? { ...i, gramsInBase: Math.max(1, newGrams) }
          : i
      )
    )

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!meta.name.trim())          return toast.error("El nombre es obligatorio.")
    if (draftIngredients.length === 0) return toast.error("Agrega al menos un ingrediente.")

    updateRecipe.mutate({
      recipeId,
      name:         meta.name.trim(),
      description:  meta.description.trim()  || undefined,
      steps:        meta.steps.trim()        || undefined,
      baseServings: meta.baseServings,
      category:     meta.category            || undefined,
      isPrivate:    meta.isPrivate,
      isVegan:      meta.isVegan,
      isVegetarian: meta.isVegetarian,
      isHealthy:    meta.isHealthy,
      isLowCarb:    meta.isLowCarb,
      isSpicy:      meta.isSpicy,
      isQuickMeal:  meta.isQuickMeal,
      imageUrl:     meta.imageUrl            || undefined,
      ingredients:  draftIngredients.map((i) => ({
        ingredientId: i.ingredientId,
        gramsInBase:  i.gramsInBase,
      })),
    })
  }

  // ── Error / loading states ────────────────────────────────────────────────────

  if (loadingRecipe || !initialized) return <EditSkeleton />

  if (recipeError || !recipe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c10]">
        <div className="text-center space-y-3">
          <span className="text-5xl">😕</span>
          <p className="font-bold text-white">Receta no encontrada</p>
          <p className="text-sm text-gray-500">No tienes acceso a esta receta o no existe.</p>
          <button onClick={() => router.push("/library")}
            className="mt-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600">
            ← Volver a mis recetas
          </button>
        </div>
      </div>
    )
  }

  const isValid   = meta.name.trim().length > 0 && draftIngredients.length > 0
  const hasChanges = initialized  // always show save once loaded

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        {/* ── Header ── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <button onClick={() => router.back()}
              className="mb-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              ← Volver
            </button>
            <h1 className="text-2xl font-black text-white">✏️ Editar receta</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {recipe.isCommunity
                ? "Esta es una copia de una receta de la comunidad — los cambios solo te afectan a ti"
                : `Última edición: ${new Date(recipe.updatedAt).toLocaleDateString("es-CO")}`
              }
            </p>
          </div>

          {/* Source badge */}
          {recipe.sourceRecipeId && (
            <div className="flex-shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-400">
              📥 Importada de la comunidad
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* ── Left: Ingredient selector ── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 sticky top-4">
              <h2 className="mb-1 font-bold text-white">Ingredientes disponibles</h2>
              <p className="mb-4 text-xs text-gray-500">
                Haz clic para añadir · se suma si ya existe
              </p>
              <ActionBox onAddIngredient={handleAddIngredient} />
            </div>
          </div>

          {/* ── Right: Recipe builder ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Nutrition preview */}
            <NutritionBar ingredients={draftIngredients} servings={meta.baseServings} />

            {/* Ingredients list */}
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5">
              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-bold text-white">
                  Ingredientes
                  {draftIngredients.length > 0 && (
                    <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                      {draftIngredients.length}
                    </span>
                  )}
                </h2>
                {/* Step selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Paso</span>
                  <div className="flex gap-1">
                    {[1, 5, 10, 25, 50].map((s) => (
                      <button key={s} onClick={() => setGlobalStep(s)}
                        className={`rounded-lg px-2 py-1 text-xs font-bold transition-all ${
                          globalStep === s
                            ? "bg-amber-500 text-white"
                            : "bg-white/5 text-gray-500 hover:bg-white/10"
                        }`}>
                        {s}g
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {draftIngredients.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl bg-white/5 py-10 text-center">
                  <span className="text-4xl">👆</span>
                  <p className="mt-2 text-sm text-gray-500">Añade ingredientes desde el panel izquierdo</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {draftIngredients.map((item) => (
                    <RecipeIngredientCard
                      key={item.ingredientId}
                      ingredientId={item.ingredientId}
                      ingredient={item.ingredient}
                      gramsInBase={item.gramsInBase}
                      onRemove={handleRemove}
                      onChangeGrams={handleChangeGrams}
                      step={globalStep}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 space-y-4">
              <h2 className="font-bold text-white">Configuración</h2>

              {/* Name + servings */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-400">
                    Nombre <span className="text-amber-400">*</span>
                  </label>
                  <input type="text" value={meta.name}
                    onChange={(e) => setMeta((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Bowl de pollo y quinua"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-400">Porciones</label>
                  <input type="number" min={1} max={100} value={meta.baseServings}
                    onChange={(e) => setMeta((p) => ({ ...p, baseServings: Math.max(1, Number(e.target.value)) }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400">Descripción</label>
                <input type="text" value={meta.description}
                  onChange={(e) => setMeta((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción corta de la receta..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none" />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400">Categoría</label>
                <select value={meta.category}
                  onChange={(e) => setMeta((p) => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                  <option value="">Sin categoría</option>
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-400">Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: "isVegan",      label: "🌱 Vegana"         },
                    { key: "isVegetarian", label: "🥬 Vegetariana"    },
                    { key: "isHealthy",    label: "💚 Saludable"      },
                    { key: "isLowCarb",    label: "🥗 Bajo en carbos" },
                    { key: "isSpicy",      label: "🌶️ Picante"        },
                    { key: "isQuickMeal",  label: "⚡ Rápida"         },
                    { key: "isPrivate",    label: "🔒 Privada"        },
                  ] as { key: keyof RecipeMeta; label: string }[]).map((tag) => (
                    <button key={tag.key}
                      onClick={() => setMeta((p) => ({ ...p, [tag.key]: !p[tag.key] }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                        meta[tag.key]
                          ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                          : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                      }`}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400">
                  Pasos de preparación
                </label>
                <textarea rows={5} value={meta.steps}
                  onChange={(e) => setMeta((p) => ({ ...p, steps: e.target.value }))}
                  placeholder={"1. Cocinar el pollo...\n2. Mezclar los ingredientes..."}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none leading-relaxed" />
              </div>

              {/* Image */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  📸 Imagen
                </label>
                {meta.imageUrl ? (
                  <div className="group relative w-full overflow-hidden rounded-2xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={meta.imageUrl} alt="Imagen de la receta"
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      ✅ Imagen actual
                    </span>
                    <button type="button"
                      onClick={() => setMeta((p) => ({ ...p, imageUrl: "" }))}
                      className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm hover:bg-red-500 transition-colors"
                      title="Quitar imagen">
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 px-4 py-8 text-center hover:border-amber-500/50 transition-colors">
                    <span className="text-4xl">🖼️</span>
                    <p className="text-sm text-gray-400">Sube una imagen para la receta</p>
                    <p className="text-[10px] text-gray-600">PNG, JPG, WEBP · máx 4MB</p>
                    <UploadButton
                      endpoint="imageUploader"
                      onClientUploadComplete={(res) => {
                        const url = res[0]?.ufsUrl ?? res[0]?.url
                        if (url) setMeta((p) => ({ ...p, imageUrl: url }))
                      }}
                      onUploadError={(e) => {toast.error(`Error al subir: ${e.message}`)}}
                      appearance={{
                        container: "w-auto",
                        button: "rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-white hover:bg-amber-600 ut-uploading:bg-amber-300 ut-uploading:cursor-not-allowed",
                        allowedContent: "hidden",
                      }}
                      content={{
                        button: ({ ready, isUploading }) =>
                          isUploading ? "⏳ Subiendo..." : ready ? "📤 Subir imagen" : "Cargando..."
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-6">
              <button onClick={() => router.back()}
                className="rounded-2xl border border-white/10 px-6 py-3.5 text-sm font-bold text-gray-400 hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!isValid || updateRecipe.isPending}
                className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-base font-bold text-white shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                {updateRecipe.isPending ? "Guardando..." : "💾 Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
