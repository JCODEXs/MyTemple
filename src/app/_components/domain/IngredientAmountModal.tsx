"use client"

import { useState, useEffect, useCallback } from "react"
import { INCREMENT_STEPS, UNIT_SIZES_G, type IncrementStep, type UnitSize } from "@/lib/domain/nutrition/recipe-calculator"

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngredientItem {
  id: string
  name: string
  emoji: string | null
  imageUrl: string | null
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  defaultPricePerKg: number | null
}

interface IngredientAmountModalProps {
  ingredient: IngredientItem | null
  onConfirm: (ingredientId: string, gramsInBase: number) => void
  onClose: () => void
}

type MeasureMode = "grams" | "units"

const UNIT_LABELS: Record<UnitSize, { label: string; example: string }> = {
  SMALL:  { label: "Pequeña",     example: "~50g (1 papa chica, ½ manzana)" },
  MEDIUM: { label: "Mediana",     example: "~100g (1 manzana, 1 papa med.)" },
  LARGE:  { label: "Grande",      example: "~150g (1 banana, 1 pechuga med.)" },
  XLARGE: { label: "Extra grande", example: "~250g (1 pechuga grande, 1 mango)" },
}

// ─── Live nutrition preview ───────────────────────────────────────────────────

function NutritionPreview({
  ingredient,
  grams,
}: {
  ingredient: IngredientItem
  grams: number
}) {
  const factor = grams / 100
  const kcal    = (ingredient.kcalPer100g    * factor).toFixed(0)
  const protein = (ingredient.proteinPer100g * factor).toFixed(1)
  const carbs   = (ingredient.carbsPer100g   * factor).toFixed(1)
  const fat     = (ingredient.fatPer100g     * factor).toFixed(1)

  return (
    <div className="mt-3 rounded-xl bg-gray-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Nutrición para {grams}g
      </p>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Kcal",    value: kcal,    color: "text-orange-600 bg-orange-50" },
          { label: "Prot",    value: `${protein}g`, color: "text-blue-600 bg-blue-50"   },
          { label: "Carbs",   value: `${carbs}g`,   color: "text-yellow-600 bg-yellow-50" },
          { label: "Grasa",   value: `${fat}g`,     color: "text-red-500 bg-red-50"    },
        ].map((n) => (
          <div key={n.label} className={`rounded-lg p-2 text-center ${n.color}`}>
            <div className="text-sm font-bold">{n.value}</div>
            <div className="text-xs opacity-70">{n.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function IngredientAmountModal({
  ingredient,
  onConfirm,
  onClose,
}: IngredientAmountModalProps) {
  const [mode, setMode] = useState<MeasureMode>("grams")
  const [step, setStep] = useState<IncrementStep>(10)
  const [grams, setGrams] = useState<number>(100)
  const [unitSize, setUnitSize] = useState<UnitSize>("MEDIUM")
  const [unitCount, setUnitCount] = useState<number>(1)

  // Gramos efectivos según modo
  const effectiveGrams =
    mode === "grams" ? grams : UNIT_SIZES_G[unitSize] * unitCount

  useEffect(() => {
    if (!ingredient) return
    setGrams(100)
    setUnitCount(1)
    setMode("grams")
  }, [ingredient])

  const handleIncrease = useCallback(() => {
    if (mode === "grams") setGrams((g) => Math.min(g + step, 5000))
    else setUnitCount((u) => Math.min(u + 1, 50))
  }, [mode, step])

  const handleDecrease = useCallback(() => {
    if (mode === "grams") setGrams((g) => Math.max(g - step, step))
    else setUnitCount((u) => Math.max(u - 1, 1))
  }, [mode, step])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowUp")   handleIncrease()
      if (e.key === "ArrowDown") handleDecrease()
      if (e.key === "Escape")    onClose()
      if (e.key === "Enter")     ingredient && onConfirm(ingredient.id, effectiveGrams)
    },
    [handleIncrease, handleDecrease, onClose, onConfirm, ingredient, effectiveGrams]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  if (!ingredient) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-5">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 transition-colors"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-4xl">
              {ingredient.emoji ?? "🥄"}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {ingredient.name}
              </h2>
              <p className="text-sm text-white/80">
                {ingredient.kcalPer100g} kcal / 100g
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* Mode toggle */}
          <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
            {(["grams", "units"] as MeasureMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  mode === m
                    ? "bg-white text-amber-700 shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "grams" ? "⚖️ Gramos" : "🧩 Unidades"}
              </button>
            ))}
          </div>

          {mode === "grams" ? (
            <>
              {/* Step selector */}
              <div className="mb-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Paso de incremento
                </p>
                <div className="flex flex-wrap gap-2">
                  {INCREMENT_STEPS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStep(s)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                        step === s
                          ? "bg-amber-500 text-white shadow"
                          : "bg-gray-100 text-gray-600 hover:bg-amber-100"
                      }`}
                    >
                      {s}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount control */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleDecrease}
                  disabled={grams <= step}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-30 transition-all active:scale-95"
                >
                  −
                </button>
                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    value={grams}
                    onChange={(e) => setGrams(Math.max(1, Number(e.target.value)))}
                    className="w-24 rounded-xl border-2 border-amber-200 py-2 text-center text-2xl font-bold text-gray-800 focus:border-amber-400 focus:outline-none"
                    min={1}
                    max={5000}
                  />
                  <span className="text-sm text-gray-400">gramos</span>
                </div>
                <button
                  onClick={handleIncrease}
                  disabled={grams >= 5000}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-30 transition-all active:scale-95"
                >
                  +
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Unit size selector */}
              <div className="mb-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Tamaño de la unidad
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(UNIT_LABELS) as UnitSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setUnitSize(size)}
                      className={`rounded-xl p-3 text-left transition-all ${
                        unitSize === size
                          ? "bg-amber-500 text-white shadow"
                          : "bg-gray-100 text-gray-700 hover:bg-amber-100"
                      }`}
                    >
                      <div className="font-semibold text-sm">
                        {UNIT_LABELS[size].label}
                      </div>
                      <div className={`text-xs mt-0.5 ${unitSize === size ? "text-white/80" : "text-gray-400"}`}>
                        {UNIT_LABELS[size].example}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Unit count */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleDecrease}
                  disabled={unitCount <= 1}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-30 transition-all active:scale-95"
                >
                  −
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-bold text-gray-800">{unitCount}</span>
                  <span className="text-sm text-gray-400">
                    unidad{unitCount !== 1 ? "es" : ""} · {effectiveGrams}g total
                  </span>
                </div>
                <button
                  onClick={handleIncrease}
                  disabled={unitCount >= 50}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-30 transition-all active:scale-95"
                >
                  +
                </button>
              </div>
            </>
          )}

          {/* Nutrition preview */}
          <NutritionPreview ingredient={ingredient} grams={effectiveGrams} />

          {/* Confirm button */}
          <button
            onClick={() => onConfirm(ingredient.id, effectiveGrams)}
            disabled={effectiveGrams <= 0}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-base font-bold text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            Agregar {effectiveGrams}g de {ingredient.name}
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">
            ↑↓ flechas · Enter confirmar · Esc cerrar
          </p>
        </div>
      </div>
    </div>
  )
}
