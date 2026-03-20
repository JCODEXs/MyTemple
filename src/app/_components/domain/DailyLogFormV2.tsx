"use client"

import { useState, useMemo, useCallback } from "react"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import type { WorkoutType } from "@/generated/prisma"
import type { RouterOutputs } from "@/trpc/react"
import {
  SPORTS, SPORT_CATEGORIES,
  calculateSportKcal, getIntensityDescription,
  type SportDefinition,
} from "@/lib/domain/nutrition/sports-calculator"

type EnergyResult  = RouterOutputs["dailyLog"]["logDay"]
type RecipeItem    = RouterOutputs["recipe"]["getAll"][number]

// ─── Meal slots ───────────────────────────────────────────────────────────────

const MEAL_SLOTS = [
  { id: "BREAKFAST",    label: "Desayuno",      emoji: "🌅", time: "7:00–9:00"   },
  { id: "LUNCH",        label: "Almuerzo",      emoji: "☀️", time: "12:00–14:00" },
  { id: "DINNER",       label: "Cena",          emoji: "🌙", time: "19:00–21:00" },
  { id: "SNACK",        label: "Entremida / Snack", emoji: "🍎", time: "cualquier hora" },
  { id: "SUPPLEMENT",  label: "Suplemento",    emoji: "💊", time: "según protocolo" },
] as const

type MealSlotId = typeof MEAL_SLOTS[number]["id"]

interface MealEntry {
  recipeId:    string
  recipeName:  string
  servings:    number
  kcal:        number
  proteinG:    number
  carbsG:      number
  fatG:        number
}

type MealPlan = Partial<Record<MealSlotId, MealEntry[]>>

const WORKOUT_TYPES: { value: WorkoutType; label: string; emoji: string }[] = [
  { value: "STRENGTH", label: "Fuerza",    emoji: "🏋️" },
  { value: "CARDIO",   label: "Cardio",    emoji: "🏃" },
  { value: "HIIT",     label: "HIIT",      emoji: "⚡" },
  { value: "SPORTS",   label: "Deporte",   emoji: "⚽" },
  { value: "MOBILITY", label: "Movilidad", emoji: "🧘" },
  { value: "OTHER",    label: "Otro",      emoji: "💪" },
]

// ─── Energy result modal ──────────────────────────────────────────────────────

function EnergyResultCard({ result, onClose }: { result: EnergyResult; onClose: () => void }) {
  const { energy, hydrationMl } = result
  const isDeficit = energy.balance < 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className={`p-6 text-center text-white ${isDeficit ? "bg-gradient-to-br from-blue-500 to-blue-700" : "bg-gradient-to-br from-orange-500 to-red-600"}`}>
          <div className="text-5xl mb-2">{isDeficit ? "📉" : "📈"}</div>
          <p className="text-sm font-medium opacity-80">Balance energético del día</p>
          <p className="text-4xl font-black mt-1">
            {energy.balance > 0 ? "+" : ""}{energy.balance.toFixed(0)}
            <span className="text-lg font-normal opacity-80"> kcal</span>
          </p>
          <p className="text-sm mt-1 opacity-70">{isDeficit ? "Déficit calórico ✓" : "Superávit calórico"}</p>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: "Calorías consumidas",  value: `${result.energy.caloriesIn?.toFixed(0) ?? "—"} kcal`, icon: "🍽️" },
            { label: "Gasto total (TDEE)",   value: `${energy.caloriesOut.toFixed(0)} kcal`,               icon: "🔥" },
            { label: "BMR",                  value: `${energy.bmr.toFixed(0)} kcal`,                       icon: "❤️" },
            { label: "Δ Peso estimado",      value: `${energy.estimatedWeightDeltaKg > 0 ? "+" : ""}${energy.estimatedWeightDeltaKg.toFixed(3)} kg`, icon: "⚖️" },
            { label: "Hidratación sugerida", value: `${(hydrationMl / 1000).toFixed(1)} L`,                icon: "💧" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600"><span>{row.icon}</span>{row.label}</span>
              <span className="text-sm font-bold text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-white shadow hover:from-amber-600 hover:to-orange-600 transition-all">
            Entendido 👍
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Recipe picker modal ──────────────────────────────────────────────────────

function RecipePickerModal({
  slotId,
  slotLabel,
  recipes,
  onConfirm,
  onClose,
}: {
  slotId:    MealSlotId
  slotLabel: string
  recipes:   RecipeItem[]
  onConfirm: (slotId: MealSlotId, entries: MealEntry[]) => void
  onClose:   () => void
}) {
  const [selected,  setSelected]  = useState<Record<string, number>>({}) // recipeId → servings
  const [search,    setSearch]    = useState("")

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (recipe: RecipeItem) => {
    setSelected((prev) =>
      prev[recipe.id] ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== recipe.id))
                      : { ...prev, [recipe.id]: 1 }
    )
  }

  const handleConfirm = () => {
    const entries: MealEntry[] = Object.entries(selected).map(([recipeId, servings]) => {
      const recipe = recipes.find((r) => r.id === recipeId)!
      const ps = recipe.nutrition.perServing
      return {
        recipeId,
        recipeName: recipe.name,
        servings,
        kcal:     ps.kcal     * servings,
        proteinG: ps.proteinG * servings,
        carbsG:   ps.carbsG   * servings,
        fatG:     ps.fatG     * servings,
      }
    })
    onConfirm(slotId, entries)
    onClose()
  }

  const totalKcal = Object.entries(selected).reduce((acc, [id, servings]) => {
    const r = recipes.find((r) => r.id === id)
    return acc + (r?.nutrition.perServing.kcal ?? 0) * servings
  }, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-t-3xl bg-[#1a1a2e] sm:rounded-3xl overflow-hidden shadow-2xl" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-black text-white">Agregar al {slotLabel}</h3>
            <button onClick={onClose} className="rounded-full bg-white/10 p-1.5 text-gray-400 hover:bg-white/20">✕</button>
          </div>
          <input type="text" placeholder="🔍 Buscar receta..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>

        {/* Recipe list */}
        <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: "55vh" }}>
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 py-8 text-sm">Sin recetas guardadas aún</p>
          )}
          {filtered.map((recipe) => {
            const isSelected = !!selected[recipe.id]
            const servings   = selected[recipe.id] ?? 1
            const ps         = recipe.nutrition.perServing

            return (
              <div key={recipe.id}
                className={`rounded-2xl p-4 transition-all cursor-pointer ${isSelected ? "bg-amber-500/20 ring-2 ring-amber-500" : "bg-white/5 hover:bg-white/10"}`}
                onClick={() => toggle(recipe)}>
                <div className="flex items-start gap-3">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.name} className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">
                      🍽️
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{recipe.name}</p>
                    <p className="text-xs text-gray-400">
                      {ps.kcal.toFixed(0)} kcal · P{ps.proteinG.toFixed(0)}g · C{ps.carbsG.toFixed(0)}g · G{ps.fatG.toFixed(0)}g
                      <span className="text-gray-600"> /porción</span>
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setSelected((p) => ({ ...p, [recipe.id]: Math.max(0.5, servings - 0.5) }))}
                        className="h-7 w-7 rounded-full bg-white/10 text-white font-bold text-lg hover:bg-white/20 flex items-center justify-center">−</button>
                      <span className="w-8 text-center text-sm font-black text-amber-400">{servings}</span>
                      <button onClick={() => setSelected((p) => ({ ...p, [recipe.id]: servings + 0.5 }))}
                        className="h-7 w-7 rounded-full bg-white/10 text-white font-bold text-lg hover:bg-white/20 flex items-center justify-center">+</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          {Object.keys(selected).length > 0 && (
            <p className="text-xs text-amber-400 text-center mb-2 font-semibold">
              {Object.keys(selected).length} receta{Object.keys(selected).length !== 1 ? "s" : ""} · {totalKcal.toFixed(0)} kcal total
            </p>
          )}
          <button onClick={handleConfirm} disabled={Object.keys(selected).length === 0}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-white shadow hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 transition-all">
            Agregar al {slotLabel} ✓
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sport selector ───────────────────────────────────────────────────────────

function SportSelector({
  selected,
  onSelect,
}: {
  selected: SportDefinition | null
  onSelect: (s: SportDefinition) => void
}) {
  const [openCat, setOpenCat] = useState<string | null>("team")

  const byCategory = useMemo(() =>
    Object.entries(SPORT_CATEGORIES).map(([catId, meta]) => ({
      catId, meta,
      sports: SPORTS.filter((s) => s.category === catId),
    })), []
  )

  return (
    <div className="space-y-2">
      {byCategory.map(({ catId, meta, sports }) => (
        <div key={catId}>
          <button onClick={() => setOpenCat(openCat === catId ? null : catId)}
            className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-amber-50 transition-colors">
            <span>{meta.emoji} {meta.label}</span>
            <span className="text-gray-400 text-xs">{openCat === catId ? "▲" : "▼"}</span>
          </button>
          {openCat === catId && (
            <div className="mt-1 grid grid-cols-2 gap-1.5 px-1">
              {sports.map((sport) => (
                <button key={sport.id} onClick={() => onSelect(sport)}
                  className={`rounded-xl px-3 py-2.5 text-left transition-all ${
                    selected?.id === sport.id
                      ? "bg-amber-500 text-white shadow"
                      : "bg-white text-gray-700 hover:bg-amber-50 ring-1 ring-gray-200"
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{sport.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{sport.name}</p>
                      <p className={`text-[10px] truncate ${selected?.id === sport.id ? "text-white/70" : "text-gray-400"}`}>
                        MET {sport.metMin}–{sport.metMax}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Meal slot row ────────────────────────────────────────────────────────────

function MealSlotRow({
  slot,
  entries,
  onAdd,
  onRemove,
  onChangeServings,
}: {
  slot:            typeof MEAL_SLOTS[number]
  entries:         MealEntry[]
  onAdd:           () => void
  onRemove:        (recipeId: string) => void
  onChangeServings:(recipeId: string, servings: number) => void
}) {
  const totalKcal = entries.reduce((s, e) => s + e.kcal, 0)

  return (
    <div className="rounded-2xl bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">{slot.emoji}</span>
          <div>
            <p className="text-sm font-bold text-gray-900">{slot.label}</p>
            <p className="text-[10px] text-gray-400">{slot.time}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalKcal > 0 && (
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
              {totalKcal.toFixed(0)} kcal
            </span>
          )}
          <button onClick={onAdd}
            className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors">
            + Agregar
          </button>
        </div>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <p className="px-4 py-3 text-xs text-gray-400 italic">Sin recetas añadidas</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {entries.map((entry) => (
            <div key={entry.recipeId} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{entry.recipeName}</p>
                <p className="text-[10px] text-gray-400">
                  {entry.kcal.toFixed(0)} kcal · P{entry.proteinG.toFixed(0)} C{entry.carbsG.toFixed(0)} G{entry.fatG.toFixed(0)}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onChangeServings(entry.recipeId, Math.max(0.5, entry.servings - 0.5))}
                  className="h-6 w-6 rounded-full bg-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-300 flex items-center justify-center">−</button>
                <span className="w-8 text-center text-xs font-black text-amber-600">{entry.servings}p</span>
                <button onClick={() => onChangeServings(entry.recipeId, entry.servings + 0.5)}
                  className="h-6 w-6 rounded-full bg-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-300 flex items-center justify-center">+</button>
                <button onClick={() => onRemove(entry.recipeId)}
                  className="ml-1 h-6 w-6 rounded-full bg-red-50 text-red-400 text-xs font-bold hover:bg-red-100 flex items-center justify-center">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DailyLogForm({ date }: { date?: Date }) {
  const today  = date ?? new Date()
  const [result, setResult] = useState<EnergyResult | null>(null)

  // --- Preloaded meal plan (from db) ---
  const { data: planForToday } = api.nutritionPlan.getPlanForDate.useQuery(
  { date: today },
  { staleTime: 60_000 }
)

// Pre-cargar mealPlan desde el plan cuando llega
useEffect(() => {
  if (!planForToday || Object.keys(mealPlan).length > 0) return

  const preloaded: MealPlan = {}
  for (const meal of planForToday.meals) {
    preloaded[meal.mealType as MealSlotId] = meal.recipes.map((r) => ({
      recipeId:   r.recipeId,
      recipeName: r.recipeName,
      servings:   r.servings,
      kcal:       r.kcal,
      proteinG:   r.proteinG,
      carbsG:     r.carbsG,
      fatG:       r.fatG,
    }))
  }
  setMealPlan(preloaded)
  setMode("detailed") // cambiar a modo detallado automáticamente
}, [planForToday])

  // ── Mode ────────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"simple" | "detailed">("simple")

  // ── Simple mode state ────────────────────────────────────────────────────────
  const [caloriesIn, setCaloriesIn] = useState(2000)
  const [protein,    setProtein]    = useState(150)
  const [carbs,      setCarbs]      = useState(220)
  const [fat,        setFat]        = useState(70)

  // ── Detailed mode state ──────────────────────────────────────────────────────
  const [mealPlan, setMealPlan] = useState<MealPlan>({})
  const [pickerSlot, setPickerSlot] = useState<MealSlotId | null>(null)

  const { data: recipes = [] } = api.recipe.getAll.useQuery()
  const { data: profile      } = api.userProfile.get.useQuery()

  // Totals from meal plan
  const mealTotals = useMemo(() => {
    const all = Object.values(mealPlan).flat()
    return {
      kcal:     all.reduce((s, e) => s + e.kcal, 0),
      proteinG: all.reduce((s, e) => s + e.proteinG, 0),
      carbsG:   all.reduce((s, e) => s + e.carbsG, 0),
      fatG:     all.reduce((s, e) => s + e.fatG, 0),
    }
  }, [mealPlan])

  // ── Workout state ────────────────────────────────────────────────────────────
  const [hasWorkout,   setHasWorkout]   = useState(false)
  const [workoutType,  setWorkoutType]  = useState<WorkoutType>("STRENGTH")
  const [selectedSport, setSelectedSport] = useState<SportDefinition | null>(null)
  const [duration,     setDuration]     = useState(60)
  const [intensity,    setIntensity]    = useState(7)
  const [realKcal,     setRealKcal]     = useState<number | "">("")

  // Sport kcal estimate (only when SPORTS type selected)
  const sportKcalEstimate = useMemo(() => {
    if (workoutType !== "SPORTS" || !selectedSport || !profile) return null
    return calculateSportKcal(selectedSport, profile.weightKg, duration, intensity)
  }, [workoutType, selectedSport, profile, duration, intensity])

  const intensityInfo = getIntensityDescription(intensity)

  const macroCals  = protein * 4 + carbs * 4 + fat * 9
  const showGapWarn = Math.abs(caloriesIn - macroCals) > 100

  const logDay = api.dailyLog.logDay.useMutation({
    onSuccess: (data) => setResult(data),
    onError:   (e)    => toast.error(e.message),
  })

  const handleSubmit = () => {
    const finalKcalIn   = mode === "detailed" ? mealTotals.kcal    : caloriesIn
    const finalProtein  = mode === "detailed" ? mealTotals.proteinG : protein
    const finalCarbs    = mode === "detailed" ? mealTotals.carbsG   : carbs
    const finalFat      = mode === "detailed" ? mealTotals.fatG     : fat

    if (mode === "detailed" && finalKcalIn === 0) {
      return toast.error("Agrega al menos una receta a tu plan del día")
    }

    const effectiveRealKcal = workoutType === "SPORTS" && sportKcalEstimate && realKcal === ""
      ? sportKcalEstimate
      : realKcal === "" ? undefined : Number(realKcal)

    logDay.mutate({
      date: today,
      caloriesIn:   finalKcalIn,
      proteinGrams: finalProtein,
      carbsGrams:   finalCarbs,
      fatGrams:     finalFat,
      workout: hasWorkout ? {
        type:            workoutType,
        durationMinutes: duration,
        intensityFactor: intensity,
        realKcal:        effectiveRealKcal,
      } : undefined,
    })
  }

  // Meal plan handlers
  const handleAddToSlot = useCallback((slotId: MealSlotId, entries: MealEntry[]) => {
    setMealPlan((prev) => ({
      ...prev,
      [slotId]: [...(prev[slotId] ?? []), ...entries],
    }))
  }, [])

  const handleRemoveFromSlot = useCallback((slotId: MealSlotId, recipeId: string) => {
    setMealPlan((prev) => ({
      ...prev,
      [slotId]: (prev[slotId] ?? []).filter((e) => e.recipeId !== recipeId),
    }))
  }, [])

  const handleChangeServings = useCallback((slotId: MealSlotId, recipeId: string, servings: number) => {
    setMealPlan((prev) => ({
      ...prev,
      [slotId]: (prev[slotId] ?? []).map((e) => {
        if (e.recipeId !== recipeId) return e
        const recipe = recipes.find((r) => r.id === recipeId)
        if (!recipe) return e
        const ps = recipe.nutrition.perServing
        return { ...e, servings, kcal: ps.kcal * servings, proteinG: ps.proteinG * servings, carbsG: ps.carbsG * servings, fatG: ps.fatG * servings }
      }),
    }))
  }, [recipes])

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 md:p-6">
        <div className="mx-auto max-w-xl space-y-4">

          {/* Header */}
          <div className="text-center py-2">
            <h1 className="text-2xl font-black text-gray-900">📋 Registro del día</h1>
            <p className="text-sm text-gray-500">
              {today.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>

          {/* ── Mode toggle ── */}
          <div className="flex rounded-2xl bg-white p-1.5 shadow ring-1 ring-black/5">
            {(["simple", "detailed"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
                  mode === m
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                {m === "simple" ? "⚡ Registro rápido" : "📅 Por comidas"}
              </button>
            ))}
          </div>

          {/* ── SIMPLE MODE ── */}
          {mode === "simple" && (
            <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5 space-y-5">
              <h2 className="text-base font-black text-gray-900">🍽️ Alimentación</h2>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-bold text-gray-700">Calorías totales</label>
                  <span className="text-2xl font-black text-orange-500">{caloriesIn}</span>
                </div>
                <input type="range" min={500} max={6000} step={50} value={caloriesIn}
                  onChange={(e) => setCaloriesIn(Number(e.target.value))}
                  className="w-full accent-orange-500" />
              </div>
              <div className="space-y-4 rounded-2xl bg-gray-50 p-4">
                {[
                  { label: "Proteína",       value: protein, set: setProtein, color: "text-blue-500",  emoji: "💪", max: 400 },
                  { label: "Carbohidratos",  value: carbs,   set: setCarbs,   color: "text-amber-500", emoji: "🌾", max: 600 },
                  { label: "Grasas",         value: fat,     set: setFat,     color: "text-rose-500",  emoji: "🥑", max: 300 },
                ].map(({ label, value, set, color, emoji, max }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-gray-600">{emoji} {label}</label>
                      <span className={`text-sm font-black ${color}`}>{value}g</span>
                    </div>
                    <input type="range" min={0} max={max} value={value}
                      onChange={(e) => set(Number(e.target.value))}
                      className={`w-full h-2 rounded-full appearance-none cursor-pointer ${color}`} />
                  </div>
                ))}
              </div>
              <div className={`rounded-xl px-3 py-2 text-xs font-medium ${showGapWarn ? "bg-yellow-50 text-yellow-700 border border-yellow-200" : "bg-green-50 text-green-700"}`}>
                {showGapWarn
                  ? `⚠️ Los macros suman ${macroCals} kcal — diferencia de ${Math.abs(caloriesIn - macroCals)} kcal`
                  : `✓ Macros coherentes (${macroCals} kcal)`}
              </div>
            </div>
          )}

          {/* ── DETAILED MODE ── */}
          {mode === "detailed" && (
            <div className="space-y-3">
              {/* Totals summary */}
              {mealTotals.kcal > 0 && (
                <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
                  <p className="text-xs font-bold opacity-80 mb-1">Total del día</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black">{mealTotals.kcal.toFixed(0)}</span>
                    <span className="text-sm opacity-80 mb-1">kcal</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs opacity-90">
                    <span>P {mealTotals.proteinG.toFixed(0)}g</span>
                    <span>C {mealTotals.carbsG.toFixed(0)}g</span>
                    <span>G {mealTotals.fatG.toFixed(0)}g</span>
                  </div>
                </div>
              )}

              {MEAL_SLOTS.map((slot) => (
                <MealSlotRow
                  key={slot.id}
                  slot={slot}
                  entries={mealPlan[slot.id] ?? []}
                  onAdd={() => setPickerSlot(slot.id)}
                  onRemove={(recipeId) => handleRemoveFromSlot(slot.id, recipeId)}
                  onChangeServings={(recipeId, servings) => handleChangeServings(slot.id, recipeId, servings)}
                />
              ))}
            </div>
          )}

          {/* ── WORKOUT SECTION ── */}
          <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900">🏋️ Entrenamiento</h2>
              <button onClick={() => setHasWorkout((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${hasWorkout ? "bg-amber-500" : "bg-gray-200"}`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${hasWorkout ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {hasWorkout && (
              <div className="space-y-5">
                {/* Workout type */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Tipo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {WORKOUT_TYPES.map((w) => (
                      <button key={w.value} onClick={() => { setWorkoutType(w.value); if (w.value !== "SPORTS") setSelectedSport(null) }}
                        className={`rounded-xl py-2.5 text-center transition-all ${workoutType === w.value ? "bg-amber-500 text-white shadow" : "bg-gray-50 text-gray-600 hover:bg-amber-50"}`}>
                        <div className="text-xl">{w.emoji}</div>
                        <div className="text-xs font-semibold mt-0.5">{w.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sport selector — only when SPORTS */}
                {workoutType === "SPORTS" && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                      Selecciona el deporte
                    </label>
                    <SportSelector selected={selectedSport} onSelect={setSelectedSport} />
                    {selectedSport && (
                      <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                        <p className="font-bold">{selectedSport.emoji} {selectedSport.name}</p>
                        <p className="mt-0.5 text-amber-600">{selectedSport.description}</p>
                        <p className="mt-0.5">MET base: {selectedSport.metBase} · Rango: {selectedSport.metMin}–{selectedSport.metMax}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Duration */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-600">⏱ Duración</label>
                    <span className="text-sm font-black text-amber-600">{duration} min</span>
                  </div>
                  <input type="range" min={10} max={300} step={5} value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-amber-500" />
                </div>

                {/* Intensity */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-gray-600">🔥 Intensidad</label>
                    <span className="text-sm font-black" style={{ color: intensityInfo.color }}>
                      {intensity}/20
                    </span>
                  </div>
                  <input type="range" min={1} max={20} value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    className="w-full accent-orange-500" />
                  <div className="mt-1.5 rounded-xl px-3 py-2 text-xs font-medium"
                    style={{ background: `${intensityInfo.color}18`, color: intensityInfo.color }}>
                    <span className="font-bold">{intensityInfo.label}</span> — {intensityInfo.sublabel}
                  </div>
                </div>

                {/* Kcal estimate */}
                {sportKcalEstimate !== null && selectedSport && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-700 font-semibold">
                        {selectedSport.emoji} Estimación {selectedSport.name}
                      </span>
                      <span className="text-2xl font-black text-emerald-700">{sportKcalEstimate} <span className="text-sm font-normal">kcal</span></span>
                    </div>
                    <p className="text-[10px] text-emerald-500 mt-0.5">
                      MET × {profile?.weightKg}kg × {(duration/60).toFixed(2)}h × factor intensidad
                    </p>
                  </div>
                )}

                {/* Real kcal override */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    ⌚ Kcal del reloj <span className="text-gray-400">(opcional · sobreescribe la estimación)</span>
                  </label>
                  <input type="number" min={0} placeholder={sportKcalEstimate ? `Estimación: ${sportKcalEstimate}` : "Ej: 420"}
                    value={realKcal}
                    onChange={(e) => setRealKcal(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-amber-400 focus:outline-none" />
                </div>
              </div>
            )}

            {!hasWorkout && <p className="text-sm text-gray-400 text-center py-1">Activa si entrenaste hoy</p>}
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={logDay.isPending}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-base font-bold text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all active:scale-[0.98]">
            {logDay.isPending ? "Calculando..." : "⚡ Calcular balance del día"}
          </button>
        </div>
      </div>

      {/* Recipe picker modal */}
      {pickerSlot && (
        <RecipePickerModal
          slotId={pickerSlot}
          slotLabel={MEAL_SLOTS.find((s) => s.id === pickerSlot)?.label ?? ""}
          recipes={recipes}
          onConfirm={handleAddToSlot}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {result && <EnergyResultCard result={result} onClose={() => setResult(null)} />}
    </>
  )
}
