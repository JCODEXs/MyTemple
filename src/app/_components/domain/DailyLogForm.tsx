"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import type { WorkoutType } from "../../../../generated/prisma"
import type { RouterOutputs } from "@/trpc/react"

type EnergyResult = RouterOutputs["dailyLog"]["logDay"]

// ─── Constants ────────────────────────────────────────────────────────────────

const WORKOUT_TYPES: { value: WorkoutType; label: string; emoji: string }[] = [
  { value: "STRENGTH", label: "Fuerza",    emoji: "🏋️" },
  { value: "CARDIO",   label: "Cardio",    emoji: "🏃" },
  { value: "HIIT",     label: "HIIT",      emoji: "⚡" },
  { value: "SPORTS",   label: "Deportes",  emoji: "⚽" },
  { value: "MOBILITY", label: "Movilidad", emoji: "🧘" },
  { value: "OTHER",    label: "Otro",      emoji: "💪" },
]

const INTENSITY_LABELS: Record<number, string> = {
  2: "Muy suave", 4: "Suave", 6: "Moderado",
  8: "Intenso", 10: "Muy intenso", 12: "Máximo esfuerzo",
}

function getIntensityLabel(v: number) {
  const keys = Object.keys(INTENSITY_LABELS).map(Number).sort((a, b) => a - b)
  const key = keys.reduce((prev, k) => (v >= k ? k : prev), keys[0]!)
  return INTENSITY_LABELS[key]!
}

// ─── Result card ──────────────────────────────────────────────────────────────

function EnergyResultCard({ result, onClose }: { result: EnergyResult; onClose: () => void }) {
  const { energy, hydrationMl } = result
  const isDeficit = energy.balance < 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-center text-white ${
          isDeficit
            ? "bg-gradient-to-br from-blue-500 to-blue-700"
            : "bg-gradient-to-br from-orange-500 to-red-600"
        }`}>
          <div className="text-5xl mb-2">{isDeficit ? "📉" : "📈"}</div>
          <p className="text-sm font-medium opacity-80">Balance energético del día</p>
          <p className="text-4xl font-black mt-1">
            {energy.balance > 0 ? "+" : ""}{energy.balance.toFixed(0)}
            <span className="text-lg font-normal opacity-80"> kcal</span>
          </p>
          <p className="text-sm mt-1 opacity-70">
            {isDeficit ? "Déficit calórico ✓" : "Superávit calórico"}
          </p>
        </div>

        {/* Stats */}
        <div className="p-5 space-y-3">
          {[
            { label: "Calorías consumidas", value: `${result.energy.caloriesIn?.toFixed(0) ?? "—"} kcal`, icon: "🍽️" },
            { label: "Gasto total (TDEE)",  value: `${energy.caloriesOut.toFixed(0)} kcal`,  icon: "🔥" },
            { label: "BMR",                 value: `${energy.bmr.toFixed(0)} kcal`,           icon: "❤️" },
            { label: "Δ Peso estimado",     value: `${energy.estimatedWeightDeltaKg > 0 ? "+" : ""}${energy.estimatedWeightDeltaKg.toFixed(3)} kg`, icon: "⚖️" },
            { label: "Hidratación sugerida",value: `${(hydrationMl / 1000).toFixed(1)} L`,    icon: "💧" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span>{row.icon}</span>{row.label}
              </span>
              <span className="text-sm font-bold text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-white shadow hover:from-amber-600 hover:to-orange-600 transition-all">
            Entendido 👍
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MacroSlider ──────────────────────────────────────────────────────────────

function MacroInput({ label, value, onChange, color, emoji, max = 500 }: {
  label: string; value: number; onChange: (v: number) => void
  color: string; emoji: string; max?: number
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs font-semibold text-gray-600">{emoji} {label}</label>
        <span className={`text-sm font-black ${color}`}>{value}g</span>
      </div>
      <input type="range" min={0} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 rounded-full appearance-none cursor-pointer accent-current ${color}`} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DailyLogForm({ date }: { date?: Date }) {
  const today = date ?? new Date()
  const [result, setResult] = useState<EnergyResult | null>(null)

  // Food state
  const [caloriesIn, setCaloriesIn] = useState(2000)
  const [protein,    setProtein]    = useState(150)
  const [carbs,      setCarbs]      = useState(220)
  const [fat,        setFat]        = useState(70)

  // Workout state
  const [hasWorkout,  setHasWorkout]  = useState(false)
  const [workoutType, setWorkoutType] = useState<WorkoutType>("STRENGTH")
  const [duration,    setDuration]    = useState(60)
  const [intensity,   setIntensity]   = useState(7)
  const [realKcal,    setRealKcal]    = useState<number | "">("")

  // Derived: macro calories vs declared
  const macroCals = useMemo(() =>
    protein * 4 + carbs * 4 + fat * 9,
    [protein, carbs, fat]
  )
  const macroGap = Math.abs(caloriesIn - macroCals)
  const showGapWarning = macroGap > 100

  const logDay = api.dailyLog.logDay.useMutation({
    onSuccess: (data) => setResult(data),
    onError:   (e)    => toast.error(e.message),
  })

  const handleSubmit = () => {
    logDay.mutate({
      date: today,
      caloriesIn,
      proteinGrams: protein,
      carbsGrams:   carbs,
      fatGrams:     fat,
      workout: hasWorkout ? {
        type:            workoutType,
        durationMinutes: duration,
        intensityFactor: intensity,
        realKcal:        realKcal === "" ? undefined : realKcal,
      } : undefined,
    })
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 md:p-8">
        <div className="mx-auto max-w-xl">

          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-black text-gray-900">📋 Registro del día</h1>
            <p className="text-sm text-gray-500">
              {today.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>

          {/* ── Food section ── */}
          <div className="mb-4 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5">
            <h2 className="mb-4 text-base font-black text-gray-900">🍽️ Alimentación</h2>

            {/* Total kcal */}
            <div className="mb-5">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-bold text-gray-700">Calorías totales consumidas</label>
                <span className="text-2xl font-black text-orange-500">{caloriesIn}</span>
              </div>
              <input type="range" min={500} max={6000} step={50} value={caloriesIn}
                onChange={(e) => setCaloriesIn(Number(e.target.value))}
                className="w-full accent-orange-500" />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>500</span><span>6000 kcal</span>
              </div>
            </div>

            {/* Macros */}
            <div className="space-y-4 rounded-2xl bg-gray-50 p-4">
              <MacroInput label="Proteína" value={protein} onChange={setProtein}
                color="text-blue-500" emoji="💪" max={400} />
              <MacroInput label="Carbohidratos" value={carbs} onChange={setCarbs}
                color="text-amber-500" emoji="🌾" max={600} />
              <MacroInput label="Grasas" value={fat} onChange={setFat}
                color="text-rose-500" emoji="🥑" max={300} />
            </div>

            {/* Macro vs kcal check */}
            <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              showGapWarning
                ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                : "bg-green-50 text-green-700"
            }`}>
              {showGapWarning
                ? `⚠️ Los macros suman ${macroCals} kcal — diferencia de ${macroGap} kcal con el total declarado`
                : `✓ Macros coherentes (${macroCals} kcal desde macros)`}
            </div>
          </div>

          {/* ── Workout section ── */}
          <div className="mb-4 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-gray-900">🏋️ Entrenamiento</h2>
              <button type="button"
                onClick={() => setHasWorkout((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  hasWorkout ? "bg-amber-500" : "bg-gray-200"
                }`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  hasWorkout ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {hasWorkout && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Workout type */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Tipo de entrenamiento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {WORKOUT_TYPES.map((w) => (
                      <button key={w.value} type="button"
                        onClick={() => setWorkoutType(w.value)}
                        className={`rounded-xl py-2.5 text-center transition-all ${
                          workoutType === w.value
                            ? "bg-amber-500 text-white shadow"
                            : "bg-gray-50 text-gray-600 hover:bg-amber-50"
                        }`}>
                        <div className="text-xl">{w.emoji}</div>
                        <div className="text-xs font-semibold mt-0.5">{w.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

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
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-600">🔥 Intensidad</label>
                    <span className="text-sm font-black text-orange-500">
                      {intensity}/20 — {getIntensityLabel(intensity)}
                    </span>
                  </div>
                  <input type="range" min={1} max={20} value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    className="w-full accent-orange-500" />
                </div>

                {/* Real kcal (optional) */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    ⌚ Kcal del reloj / sensor <span className="text-gray-400">(opcional — sobreescribe la estimación)</span>
                  </label>
                  <input type="number" min={0} placeholder="Ej: 420"
                    value={realKcal}
                    onChange={(e) => setRealKcal(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-amber-400 focus:outline-none" />
                </div>
              </div>
            )}

            {!hasWorkout && (
              <p className="text-sm text-gray-400 text-center py-2">
                Activa si entrenaste hoy para incluirlo en el cálculo
              </p>
            )}
          </div>

          {/* Submit */}
          <button type="button" onClick={handleSubmit}
            disabled={logDay.isPending}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-base font-bold text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all active:scale-[0.98]">
            {logDay.isPending ? "Calculando..." : "⚡ Calcular balance del día"}
          </button>
        </div>
      </div>

      {result && <EnergyResultCard result={result} onClose={() => setResult(null)} />}
    </>
  )
}
