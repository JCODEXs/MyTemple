"use client"

import { useState, useMemo } from "react"
import { UploadButton } from "@/utils/uploadthing"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import ActionBox from "./ActionBox"
import RecipeIngredientCard from "./RecipeIngredientCard"
import { calculateRecipeNutrition } from "@/lib/domain/nutrition/recipe-calculator"
import type { RouterOutputs } from "@/trpc/react"


// ─── Types ────────────────────────────────────────────────────────────────────

type IngredientItem = RouterOutputs["ingredient"]["getActive"][number]

interface RecipeIngredientDraft {
  ingredientId: string
  ingredient: IngredientItem
  gramsInBase: number
}

interface RecipeMeta {
  name: string
  baseServings: number
  category: string | ""
  isPrivate: boolean
  isVegan: boolean
  isVegetarian: boolean
  isHealthy: boolean
  isLowCarb: boolean
  isSpicy: boolean
  isQuickMeal: boolean
  steps: string
  imageUrl: string
}

const DEFAULT_META: RecipeMeta = {
  name: "",
  baseServings: 1,
  category: "",
  isPrivate: false,
  isVegan: false,
  isVegetarian: false,
  isHealthy: false,
  isLowCarb: false,
  isSpicy: false,
  isQuickMeal: false,
  steps: "",
  imageUrl: "",
}

const CATEGORY_OPTIONS: { value: RecipeCategory; label: string }[] = [
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

// ─── Nutrition summary bar ────────────────────────────────────────────────────

function NutritionBar({ ingredients, servings }: {
  ingredients: RecipeIngredientDraft[]
  servings: number
}) {
  const nutrition = useMemo(() => {
    if (ingredients.length === 0) return null
    return calculateRecipeNutrition(
      ingredients.map((i) => ({
        ingredient: {
          id: i.ingredientId,
          name: i.ingredient.name,
          kcalPer100g: i.ingredient.kcalPer100g,
          proteinPer100g: i.ingredient.proteinPer100g,
          carbsPer100g: i.ingredient.carbsPer100g,
          fatPer100g: i.ingredient.fatPer100g,
          fiberPer100g: i.ingredient.fiberPer100g,
        },
        gramsInBase: i.gramsInBase,
      })),
      servings
    )
  }, [ingredients, servings])

  if (!nutrition) return null

  const ps = nutrition.perServing

  return (
    <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700">
        Nutrición estimada por porción
      </p>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Kcal",  value: ps.kcal.toFixed(0),    color: "from-orange-400 to-red-400"   },
          { label: "Prot",  value: `${ps.proteinG.toFixed(1)}g`, color: "from-blue-400 to-blue-500"    },
          { label: "Carbs", value: `${ps.carbsG.toFixed(1)}g`,  color: "from-yellow-400 to-amber-400" },
          { label: "Grasa", value: `${ps.fatG.toFixed(1)}g`,    color: "from-rose-400 to-pink-400"    },
        ].map((n) => (
          <div key={n.label} className={`rounded-xl bg-gradient-to-br ${n.color} p-3 text-center text-white shadow`}>
            <div className="text-lg font-bold leading-none">{n.value}</div>
            <div className="text-xs font-medium opacity-80">{n.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-right text-xs text-gray-400">
        Total receta: {nutrition.total.kcal.toFixed(0)} kcal · {nutrition.totalWeightG}g
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DesignRecipe() {
  const utils = api.useUtils()

  const [meta, setMeta] = useState<RecipeMeta>(DEFAULT_META)
  const [draftIngredients, setDraftIngredients] = useState<RecipeIngredientDraft[]>([])
  const [globalStep, setGlobalStep] = useState(10)

  const { data: activeIngredients = [] } = api.ingredient.getActive.useQuery(
    undefined,
    { staleTime: Infinity }  // inmutable — solo cambia si el usuario edita su catálogo
  )

  const createRecipe = api.recipe.create.useMutation({
    onSuccess: () => {
      void utils.recipe.getAll.invalidate()
      toast.success("Receta guardada en tu biblioteca 🎉")
      setMeta(DEFAULT_META)
      setDraftIngredients([])
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleAddIngredient = (ingredientId: string, gramsInBase: number) => {
    const ingredient = activeIngredients.find((i) => i.id === ingredientId)
    if (!ingredient) return

    setDraftIngredients((prev) => {
      const existing = prev.find((i) => i.ingredientId === ingredientId)
      if (existing) {
        // Sumar gramos si ya existe
        return prev.map((i) =>
          i.ingredientId === ingredientId
            ? { ...i, gramsInBase: i.gramsInBase + gramsInBase }
            : i
        )
      }
      return [...prev, { ingredientId, ingredient, gramsInBase }]
    })
  }

  const handleRemove = (ingredientId: string) => {
    setDraftIngredients((prev) => prev.filter((i) => i.ingredientId !== ingredientId))
  }

  const handleChangeGrams = (ingredientId: string, newGrams: number) => {
    setDraftIngredients((prev) =>
      prev.map((i) =>
        i.ingredientId === ingredientId
          ? { ...i, gramsInBase: Math.max(1, newGrams) }
          : i
      )
    )
  }

  const handleSave = () => {
    if (!meta.name.trim()) return toast.error("El nombre de la receta es obligatorio.")
    if (draftIngredients.length === 0) return toast.error("Agrega al menos un ingrediente.")

    createRecipe.mutate({
      name: meta.name,
      baseServings: meta.baseServings,
      category: meta.category || undefined,
      isPrivate: meta.isPrivate,
      isVegan: meta.isVegan,
      isVegetarian: meta.isVegetarian,
      isHealthy: meta.isHealthy,
      isLowCarb: meta.isLowCarb,
      isSpicy: meta.isSpicy,
      isQuickMeal: meta.isQuickMeal,
      steps: meta.steps || undefined,
      imageUrl: meta.imageUrl || undefined,
      ingredients: draftIngredients.map((i) => ({
        ingredientId: i.ingredientId,
        gramsInBase: i.gramsInBase,
      })),
    })
  }

  const isValid = meta.name.trim().length > 0 && draftIngredients.length > 0

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">

        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-amber-900">🍳 Diseñar Receta</h1>
          <p className="text-amber-700">Construye tu receta y calcula su contenido nutricional al instante</p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* ─── Left: Ingredient selector ─────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white shadow-md p-5">
              <h2 className="mb-3 font-bold text-gray-800">Ingredientes disponibles</h2>
              <p className="mb-3 text-sm text-gray-500">
                Haz clic en un ingrediente para seleccionar la cantidad
              </p>
              <ActionBox onAddIngredient={handleAddIngredient} />
            </div>
          </div>

          {/* ─── Right: Recipe builder ─────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Nutrition bar */}
            <NutritionBar
              ingredients={draftIngredients}
              servings={meta.baseServings}
            />

            {/* Ingredients in recipe */}
            <div className="rounded-2xl bg-white p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
                <h2 className="font-bold text-gray-800">
                  Ingredientes en la receta
                  {draftIngredients.length > 0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      {draftIngredients.length}
                    </span>
                  )}
                </h2>
                {/* Global step for cards */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    Paso de ajuste
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[1, 5, 10, 25, 50].map((s) => (
                      <button
                        key={s}
                        onClick={() => setGlobalStep(s)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                          globalStep === s
                            ? "bg-amber-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-amber-100"
                        }`}
                      >
                        {s}g
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {draftIngredients.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-amber-50 py-10 text-center">
                  <span className="text-4xl">👆</span>
                  <p className="mt-2 text-sm text-amber-700 font-medium">
                    Agrega ingredientes desde el panel izquierdo
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
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

            {/* Recipe metadata */}
            <div className="rounded-2xl bg-white p-5 shadow-md space-y-4">
              <h2 className="font-bold text-gray-800">Configuración de la receta</h2>

              {/* Name + servings */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={meta.name}
                    onChange={(e) => setMeta((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Bowl de pollo y quinua"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    Porciones *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={meta.baseServings}
                    onChange={(e) => setMeta((p) => ({ ...p, baseServings: Math.max(1, Number(e.target.value)) }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Categoría</label>
                <select
                  value={meta.category}
                  onChange={(e) => setMeta((p) => ({ ...p, category: e.target.value as RecipeCategory | "" }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-amber-400 focus:outline-none"
                >
                  <option value="">Sin categoría</option>
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-500">Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: "isVegan",      label: "🌱 Vegana"       },
                    { key: "isVegetarian", label: "🥬 Vegetariana"  },
                    { key: "isHealthy",    label: "💚 Saludable"    },
                    { key: "isLowCarb",    label: "🥗 Bajo en carbos" },
                    { key: "isSpicy",      label: "🌶️ Picante"      },
                    { key: "isQuickMeal",  label: "⚡ Rápida"       },
                    { key: "isPrivate",    label: "🔒 Privada"      },
                  ] as { key: keyof RecipeMeta; label: string }[]).map((tag) => (
                    <button
                      key={tag.key}
                      onClick={() => setMeta((p) => ({ ...p, [tag.key]: !p[tag.key] }))}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        meta[tag.key]
                          ? "bg-amber-500 text-white shadow"
                          : "bg-gray-100 text-gray-600 hover:bg-amber-100"
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">
                  Pasos de preparación
                </label>
                <textarea
                  rows={4}
                  value={meta.steps}
                  onChange={(e) => setMeta((p) => ({ ...p, steps: e.target.value }))}
                  placeholder="1. Cocinar el pollo a fuego medio...&#10;2. Mezclar los ingredientes..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  📸 Imagen de la receta
                </label>

                {meta.imageUrl ? (
                  /* ── Thumbnail preview ── */
                  <div className="group relative w-full overflow-hidden rounded-2xl border-2 border-amber-200 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={meta.imageUrl}
                      alt="Imagen de la receta"
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    {/* badge bottom-left */}
                    <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-700 shadow">
                      ✅ Imagen cargada
                    </span>
                    {/* remove button top-right */}
                    <button
                      type="button"
                      onClick={() => setMeta((p) => ({ ...p, imageUrl: "" }))}
                      className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-red-500 shadow transition-all hover:bg-red-500 hover:text-white"
                      title="Quitar imagen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  /* ── Upload zone ── */
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 px-4 py-8 text-center transition-colors hover:border-amber-400 hover:bg-amber-50">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-3xl shadow-inner">
                      🖼️
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Sube una foto de tu receta</p>
                      <p className="mt-0.5 text-xs text-gray-400">PNG, JPG o WEBP · máx. 4 MB</p>
                    </div>
                    <UploadButton
                      endpoint="imageUploader"
                      onClientUploadComplete={(res) => {
                        const url = res[0]?.ufsUrl ?? res[0]?.url
                        if (url) setMeta((p) => ({ ...p, imageUrl: url }))
                      }}
                      onUploadError={(error: Error) =>
                        toast.error(`Error al subir imagen: ${error.message}`)
                      }
                      appearance={{
                        container: "mt-1 w-auto",
                        button:
                          "rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow transition-colors hover:bg-amber-600 ut-uploading:cursor-not-allowed ut-uploading:bg-amber-300",
                        allowedContent: "hidden",
                      }}
                      content={{
                        button({ ready, isUploading }) {
                          if (isUploading) return "⏳ Subiendo..."
                          if (ready) return "📤 Seleccionar imagen"
                          return "Cargando..."
                        },
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!isValid || createRecipe.isPending}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-base font-bold text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {createRecipe.isPending ? "Guardando..." : "💾 Guardar en mi biblioteca"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
