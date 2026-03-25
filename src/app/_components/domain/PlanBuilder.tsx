"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import { MEAL_SLOTS, GOAL_MACRO_SPLITS, type MealSlotId } from "@/lib/domain/nutrition/plan-generator"
import type { MealType } from "../../../../generated/prisma"
import type { RouterOutputs } from "@/trpc/react"

type Suggestion     = RouterOutputs["nutritionPlan"]["generateSuggestion"]
type SuggestedDay   = Suggestion["days"][number]
type SuggestedMeal  = SuggestedDay["meals"][number]
type RecipeItem     = RouterOutputs["recipe"]["getAll"][number]

// ─── Draft types (editable state) ────────────────────────────────────────────

interface DraftMealRecipe {
  recipeId:   string
  recipeName: string
  servings:   number
  kcal:       number
  proteinG:   number
  carbsG:     number
  fatG:       number
}

interface DraftMeal {
  mealType: MealType
  recipes:  DraftMealRecipe[]
}

interface DraftDay {
  date:  Date
  meals: DraftMeal[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEAL_SLOT_TO_TYPE: Record<MealSlotId, MealType> = {
  BREAKFAST:  "BREAKFAST",
  LUNCH:      "LUNCH",
  DINNER:     "DINNER",
  SNACK:      "SNACK",
  SUPPLEMENT: "SNACK",
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

function suggestionToDraft(suggestion: Suggestion): DraftDay[] {
  return suggestion.days.map((day) => ({
    date:  new Date(day.date),
    meals: day.meals.map((m) => ({
      mealType: MEAL_SLOT_TO_TYPE[m.slotId],
      recipes: [{
        recipeId:   m.recipe.id,
        recipeName: m.recipe.name,
        servings:   m.scaled.servings,
        kcal:       m.scaled.nutrition.perServing.kcal * m.scaled.servings,
        proteinG:   m.scaled.nutrition.perServing.proteinG * m.scaled.servings,
        carbsG:     m.scaled.nutrition.perServing.carbsG * m.scaled.servings,
        fatG:       m.scaled.nutrition.perServing.fatG * m.scaled.servings,
      }],
    })),
  }))
}

function dayTotals(day: DraftDay) {
  return day.meals.flatMap((m) => m.recipes).reduce(
    (acc, r) => ({
      kcal:     acc.kcal     + r.kcal,
      proteinG: acc.proteinG + r.proteinG,
      carbsG:   acc.carbsG   + r.carbsG,
      fatG:     acc.fatG     + r.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )
}

// ─── Swap recipe modal ────────────────────────────────────────────────────────

function SwapRecipeModal({
  recipes,
  onSelect,
  onClose,
}: {
  recipes:  RecipeItem[]
  onSelect: (recipe: RecipeItem) => void
  onClose:  () => void
}) {
  const [search, setSearch] = useState("")
  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-[#1a1a2e] shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-bold text-white mb-2">Cambiar receta</h3>
          <input type="text" placeholder="🔍 Buscar..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
        <div className="overflow-y-auto p-2 space-y-1" style={{ maxHeight: "50vh" }}>
          {filtered.map((r) => (
            <button key={r.id} onClick={() => { onSelect(r); onClose() }}
              className="w-full rounded-xl bg-white/5 px-4 py-3 text-left hover:bg-white/10 transition-colors">
              <p className="text-sm font-semibold text-white">{r.name}</p>
              <p className="text-xs text-gray-400">
                {r.nutrition.perServing.kcal.toFixed(0)} kcal/p ·
                P{r.nutrition.perServing.proteinG.toFixed(0)}g
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-xs text-gray-500 py-6">Sin recetas</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Day column ────────────────────────────────────────────────────────────────

function DayColumn({
  day,
  dayIndex,
  targetKcal,
  allRecipes,
  onSwap,
  onRemove,
  onChangeServings,
}: {
  day:              DraftDay
  dayIndex:         number
  targetKcal:       number
  allRecipes:       RecipeItem[]
  onSwap:           (dayIndex: number, mealType: MealType, recipeIdx: number, recipe: RecipeItem) => void
  onRemove:         (dayIndex: number, mealType: MealType, recipeIdx: number) => void
  onChangeServings: (dayIndex: number, mealType: MealType, recipeIdx: number, servings: number) => void
}) {
  const [swapTarget, setSwapTarget] = useState<{ mealType: MealType; recipeIdx: number } | null>(null)
  const totals = dayTotals(day)
  const kcalPct = Math.min(100, Math.round((totals.kcal / targetKcal) * 100))
  const isOnTarget = kcalPct >= 90 && kcalPct <= 110

  return (
    <div className="min-w-[180px] flex-shrink-0">
      {/* Day header */}
      <div className="rounded-t-2xl bg-white/5 px-3 py-2.5 border-b border-white/10 text-center">
        <p className="text-xs font-bold text-gray-400">{DAY_LABELS[dayIndex % 7]}</p>
        <p className="text-[10px] text-gray-600">
          {new Date(day.date).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
        </p>
        <div className={`mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold inline-block ${
          isOnTarget ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
        }`}>
          {totals.kcal.toFixed(0)} kcal
        </div>
        {/* Kcal progress bar */}
        <div className="mt-1 h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${isOnTarget ? "bg-green-400" : "bg-amber-400"}`}
            style={{ width: `${kcalPct}%` }} />
        </div>
      </div>

      {/* Meal slots */}
      <div className="rounded-b-2xl bg-white/5 p-2 space-y-1.5">
        {MEAL_SLOTS.filter((s) => s.kcalPct > 0).map((slot) => {
          const mealType = MEAL_SLOT_TO_TYPE[slot.id]
          const meal = day.meals.find((m) => m.mealType === mealType)

          return (
            <div key={slot.id} className="rounded-xl bg-white/5 p-2">
              <p className="text-[10px] text-gray-500 mb-1">{slot.emoji} {slot.label}</p>
              {meal?.recipes.map((r, ri) => (
                <div key={r.recipeId} className="rounded-lg bg-white/5 px-2 py-1.5 mb-1">
                  <p className="text-[10px] font-semibold text-white leading-tight truncate">
                    {r.recipeName}
                  </p>
                  <p className="text-[9px] text-gray-500">{r.kcal.toFixed(0)} kcal · {r.servings.toFixed(1)}p</p>
                  {/* Servings control */}
                  <div className="flex items-center gap-1 mt-1">
                    <button onClick={() => onChangeServings(dayIndex, mealType, ri, Math.max(0.5, r.servings - 0.5))}
                      className="h-4 w-4 rounded-full bg-white/10 text-white text-[10px] font-bold hover:bg-white/20 flex items-center justify-center">−</button>
                    <span className="text-[9px] text-amber-400 font-bold flex-1 text-center">{r.servings}p</span>
                    <button onClick={() => onChangeServings(dayIndex, mealType, ri, r.servings + 0.5)}
                      className="h-4 w-4 rounded-full bg-white/10 text-white text-[10px] font-bold hover:bg-white/20 flex items-center justify-center">+</button>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => setSwapTarget({ mealType, recipeIdx: ri })}
                      className="flex-1 rounded bg-amber-500/20 text-[9px] text-amber-400 py-0.5 hover:bg-amber-500/30">
                      ↔ Cambiar
                    </button>
                    <button onClick={() => onRemove(dayIndex, mealType, ri)}
                      className="rounded bg-red-500/20 text-[9px] text-red-400 px-1.5 py-0.5 hover:bg-red-500/30">
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {(!meal || meal.recipes.length === 0) && (
                <p className="text-[9px] text-gray-700 italic text-center py-1">Vacío</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Swap modal */}
      {swapTarget && (
        <SwapRecipeModal
          recipes={allRecipes}
          onSelect={(recipe) => onSwap(dayIndex, swapTarget.mealType, swapTarget.recipeIdx, recipe)}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlanBuilder() {
  const router = useRouter()
  const utils  = api.useUtils()

  // ── Step state ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState<"config" | "review" | "saving">("config")

  // ── Config state ─────────────────────────────────────────────────────────────
  const [planName,   setPlanName]   = useState("Mi plan nutricional")
  const [startDate,  setStartDate]  = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1) // lunes
    return d.toISOString().slice(0, 10)
  })
  const [duration,   setDuration]   = useState(7)
  const [targetKcal, setTargetKcal] = useState<number | "">("")

  // ── Suggestion + draft state ─────────────────────────────────────────────────
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [draftDays,  setDraftDays]  = useState<DraftDay[]>([])

  const { data: allRecipes = [] } = api.recipe.getAll.useQuery(
    undefined,
    { staleTime: 10 * 60_000 }  // 10 minutos — lento
  )
  const { data: profile         } = api.userProfile.getSummary.useQuery(
    undefined,
    { staleTime: 10 * 60_000 }  // 10 minutos — lento
  )

  const generate = api.nutritionPlan.generateSuggestion.useMutation({
    onSuccess: (data) => {
      setSuggestion(data)
      setDraftDays(suggestionToDraft(data))
      setStep("review")
    },
    onError: (e) => toast.error(e.message),
  })

  const createPlan = api.nutritionPlan.create.useMutation({
    onSuccess: () => {
      void utils.nutritionPlan.getAll.invalidate()
      toast.success("Plan guardado ✓")
      router.push("/plans")
    },
    onError: (e) => toast.error(e.message),
  })

  // ── Draft handlers ───────────────────────────────────────────────────────────

  const handleSwap = (dayIndex: number, mealType: MealType, recipeIdx: number, recipe: RecipeItem) => {
    setDraftDays((prev) => prev.map((day, di) => {
      if (di !== dayIndex) return day
      return {
        ...day,
        meals: day.meals.map((meal) => {
          if (meal.mealType !== mealType) return meal
          const ps = recipe.nutrition.perServing
          const newRecipes = [...meal.recipes]
          newRecipes[recipeIdx] = {
            recipeId:   recipe.id,
            recipeName: recipe.name,
            servings:   1,
            kcal:       ps.kcal,
            proteinG:   ps.proteinG,
            carbsG:     ps.carbsG,
            fatG:       ps.fatG,
          }
          return { ...meal, recipes: newRecipes }
        }),
      }
    }))
  }

  const handleRemove = (dayIndex: number, mealType: MealType, recipeIdx: number) => {
    setDraftDays((prev) => prev.map((day, di) => {
      if (di !== dayIndex) return day
      return {
        ...day,
        meals: day.meals.map((meal) => {
          if (meal.mealType !== mealType) return meal
          return { ...meal, recipes: meal.recipes.filter((_, i) => i !== recipeIdx) }
        }),
      }
    }))
  }

  const handleChangeServings = (
    dayIndex: number, mealType: MealType, recipeIdx: number, servings: number
  ) => {
    setDraftDays((prev) => prev.map((day, di) => {
      if (di !== dayIndex) return day
      return {
        ...day,
        meals: day.meals.map((meal) => {
          if (meal.mealType !== mealType) return meal
          const recipe = allRecipes.find((r) => r.id === meal.recipes[recipeIdx]?.recipeId)
          if (!recipe) return meal
          const ps = recipe.nutrition.perServing
          const newRecipes = [...meal.recipes]
          newRecipes[recipeIdx] = {
            ...newRecipes[recipeIdx]!,
            servings,
            kcal:     ps.kcal     * servings,
            proteinG: ps.proteinG * servings,
            carbsG:   ps.carbsG   * servings,
            fatG:     ps.fatG     * servings,
          }
          return { ...meal, recipes: newRecipes }
        }),
      }
    }))
  }

  // Weekly summary
  const weeklyAvg = useMemo(() => {
    if (!draftDays.length) return null
    const total = draftDays.reduce(
      (acc, day) => {
        const t = dayTotals(day)
        return { kcal: acc.kcal + t.kcal, proteinG: acc.proteinG + t.proteinG,
          carbsG: acc.carbsG + t.carbsG, fatG: acc.fatG + t.fatG }
      },
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    )
    const n = draftDays.length
    return { kcal: total.kcal / n, proteinG: total.proteinG / n,
      carbsG: total.carbsG / n, fatG: total.fatG / n }
  }, [draftDays])

  const handleSave = () => {
    if (!suggestion) return
    // eslint-disable-next-line @typescript-eslint/dot-notation
    const macroSplit = GOAL_MACRO_SPLITS[profile?.goal ?? "MAINTENANCE"] ?? GOAL_MACRO_SPLITS["MAINTENANCE"]!
    const endDate    = new Date(startDate)
    endDate.setDate(endDate.getDate() + duration - 1)

    createPlan.mutate({
      name:       planName,
      startDate:  new Date(startDate),
      endDate,
      targetKcal: suggestion.targetKcalPerDay,
      proteinPct: macroSplit.proteinPct,
      carbsPct:   macroSplit.carbsPct,
      fatPct:     macroSplit.fatPct,
      days:       draftDays.map((day) => ({
        date:  day.date,
        meals: day.meals.filter((m) => m.recipes.length > 0),
      })),
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white p-4 md:p-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => step === "review" ? setStep("config") : router.push("/plans")}
            className="rounded-xl bg-white/5 p-2 text-gray-400 hover:bg-white/10">←</button>
          <div>
            <h1 className="text-xl font-black text-white">
              {step === "config" ? "Crear plan nutricional" : "Revisar y ajustar"}
            </h1>
            <p className="text-xs text-gray-500">
              {step === "config"
                ? "Configura los parámetros del plan"
                : `${draftDays.length} días · ajusta recetas y porciones`}
            </p>
          </div>
        </div>

        {/* ── STEP 1: Config ── */}
        {step === "config" && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 space-y-4">

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Nombre del plan</label>
                <input value={planName} onChange={(e) => setPlanName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Fecha inicio</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Duración</label>
                  <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none">
                    {[3, 5, 7, 10, 14].map((d) => (
                      <option key={d} value={d}>{d} días</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Target calórico <span className="text-gray-600">(opcional — se calcula desde tu perfil)</span>
                </label>
                <input type="number" min={1000} max={6000} placeholder={
                  profile
                    ? `Tu TDEE estimado: ~${Math.round((10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + (profile.sex === "MALE" ? 5 : -161)) * profile.activityFactor)} kcal`
                    : "Ej: 2200"
                }
                  value={targetKcal}
                  onChange={(e) => setTargetKcal(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" />
              </div>

              {/* Coverage info */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
                <p className="font-bold mb-1">ℹ️ Sobre la sugerencia</p>
                <p className="text-amber-400/80 leading-relaxed">
                  El sistema distribuirá tus {allRecipes.length} recetas entre los slots del día
                  (desayuno 25%, almuerzo 35%, cena 30%, snack 10%) escalándolas al target calórico.
                  Podrás cambiar cualquier receta en el siguiente paso.
                </p>
              </div>

              <button
                onClick={() => generate.mutate({
                  startDate:    new Date(startDate),
                  durationDays: duration,
                  targetKcal:   targetKcal === "" ? undefined : targetKcal,
                })}
                disabled={generate.isPending || allRecipes.length === 0}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-sm font-bold text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 transition-all active:scale-[0.98]">
                {generate.isPending ? "Generando sugerencia..." :
                 allRecipes.length === 0 ? "Necesitas recetas guardadas" :
                 "⚡ Generar sugerencia"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review ── */}
        {step === "review" && suggestion && (
          <div className="space-y-4">

            {/* Weekly summary bar */}
            {weeklyAvg && (
              <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Promedio diario del plan</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Kcal",  value: weeklyAvg.kcal.toFixed(0),     color: "text-orange-400" },
                    { label: "Prot",  value: `${weeklyAvg.proteinG.toFixed(0)}g`, color: "text-blue-400"   },
                    { label: "Carbs", value: `${weeklyAvg.carbsG.toFixed(0)}g`,   color: "text-amber-400"  },
                    { label: "Grasa", value: `${weeklyAvg.fatG.toFixed(0)}g`,     color: "text-rose-400"   },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                  <span>Target: {suggestion.targetKcalPerDay} kcal/día</span>
                  <span>·</span>
                  <span className={suggestion.coverageScore >= 0.8 ? "text-green-400" : "text-amber-400"}>
                    {Math.round(suggestion.coverageScore * 100)}% cobertura de slots
                  </span>
                </div>
              </div>
            )}

            {/* Horizontal scrollable weekly grid */}
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                {draftDays.map((day, di) => (
                  <DayColumn
                    key={di}
                    day={day}
                    dayIndex={di}
                    targetKcal={suggestion.targetKcalPerDay}
                    allRecipes={allRecipes}
                    onSwap={handleSwap}
                    onRemove={handleRemove}
                    onChangeServings={handleChangeServings}
                  />
                ))}
              </div>
            </div>

            {/* Save bar */}
            <div className="sticky bottom-4 rounded-2xl bg-[#1a1a2e] p-4 shadow-2xl ring-1 ring-white/10 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{planName}</p>
                <p className="text-xs text-gray-500">
                  {draftDays.length} días · {new Date(startDate).toLocaleDateString("es-CO")}
                </p>
              </div>
              <button onClick={handleSave} disabled={createPlan.isPending}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all">
                {createPlan.isPending ? "Guardando..." : "💾 Guardar plan"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
