"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import type { RouterOutputs } from "@/trpc/react"

type AdaptationResult = RouterOutputs["dailyLog"]["logWeight"]

// ─── Result card ──────────────────────────────────────────────────────────────

function AdaptationResultCard({
  result,
  weight,
  onClose,
}: {
  result: AdaptationResult
  weight: number
  onClose: () => void
}) {
  const improved  = result.newFactor > result.previousFactor
  const noChange  = Math.abs(result.delta) < 0.0001

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`p-6 text-center text-white ${
          noChange   ? "bg-gradient-to-br from-gray-500 to-gray-700" :
          improved   ? "bg-gradient-to-br from-green-500 to-emerald-700" :
                       "bg-gradient-to-br from-blue-500 to-blue-700"
        }`}>
          <div className="text-5xl mb-2">
            {noChange ? "✓" : improved ? "📈" : "🧬"}
          </div>
          <p className="text-sm font-medium opacity-80">Peso registrado</p>
          <p className="text-4xl font-black mt-1">
            {weight} <span className="text-xl font-normal opacity-80">kg</span>
          </p>
        </div>

        {/* Adaptation detail */}
        <div className="p-5">
          <div className="mb-4 rounded-2xl bg-gray-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              🧬 Ajuste metabólico
            </p>
            {[
              { label: "Factor anterior", value: result.previousFactor.toFixed(4) },
              { label: "Factor nuevo",    value: result.newFactor.toFixed(4)      },
              { label: "Cambio",          value: `${result.delta > 0 ? "+" : ""}${(result.delta * 100).toFixed(3)}%` },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{row.label}</span>
                <span className="font-bold text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed mb-4 ${
            noChange  ? "bg-gray-50  text-gray-600" :
            improved  ? "bg-green-50 text-green-700" :
                        "bg-blue-50  text-blue-700"
          }`}>
            {noChange
              ? "Tu peso coincide exactamente con la estimación. El motor no necesita ajuste."
              : improved
              ? "Tu metabolismo es más rápido de lo estimado. El motor ha ajustado tu TMB al alza."
              : "Tu metabolismo es más lento de lo estimado. El motor ha ajustado tu TMB a la baja para ser más preciso en el futuro."
            }
          </div>

          <button onClick={onClose}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-white shadow hover:from-amber-600 hover:to-orange-600 transition-all">
            Entendido 👍
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WeightLogForm() {
  // Stable midnight date — computed once on mount
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])
  const [weight,    setWeight]    = useState<number>(70)
  const [inputVal,  setInputVal]  = useState("70")
  const [result,    setResult]    = useState<AdaptationResult | null>(null)

  const { data: profile } = api.userProfile.getSummary.useQuery()
  const utils = api.useUtils()

  const logWeight = api.dailyLog.logWeight.useMutation({
    onSuccess: (data) => {
      void utils.userProfile.getSummary.invalidate()
      setResult(data)
    },
    onError: (e) => toast.error(e.message),
  })

  const handleSubmit = () => {
    if (!weight || weight <= 0) return toast.error("Ingresa un peso válido")
    logWeight.mutate({ date: today, weightKg: weight })
  }

  const estimatedWeight = profile?.estimatedCurrentWeight
  const lastLogged      = profile?.latestLoggedWeight
  const diff            = estimatedWeight ? weight - estimatedWeight : null

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 flex items-center justify-center">
        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-3xl shadow-lg">
              ⚖️
            </div>
            <h1 className="text-2xl font-black text-gray-900">Registrar peso</h1>
            <p className="text-sm text-gray-500 mt-1">
              {today.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5 space-y-5">

            {/* Context from profile */}
            {profile && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Último registrado</p>
                  <p className="text-xl font-black text-gray-800">{lastLogged?.toFixed(1)} kg</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 text-center">
                  <p className="text-xs text-amber-600 mb-0.5">Estimado hoy</p>
                  <p className="text-xl font-black text-amber-700">
                    {estimatedWeight?.toFixed(1)} kg
                  </p>
                </div>
              </div>
            )}

            {/* Weight input — large tactile */}
            <div className="text-center">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-400 block mb-3">
                Peso actual
              </label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    const v = Math.max(20, weight - 0.1)
                    setWeight(parseFloat(v.toFixed(1)))
                    setInputVal(v.toFixed(1))
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl font-black text-gray-600 hover:bg-gray-200 active:scale-90 transition-all">
                  −
                </button>
                <div className="relative">
                  <input
                    type="number"
                    value={inputVal}
                    step={0.1}
                    min={20}
                    max={400}
                    onChange={(e) => {
                      setInputVal(e.target.value)
                      const n = parseFloat(e.target.value)
                      if (!isNaN(n)) setWeight(n)
                    }}
                    className="w-32 rounded-2xl border-2 border-amber-300 py-3 text-center text-4xl font-black text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-200 transition-all"
                  />
                  <span className="absolute -bottom-5 left-0 right-0 text-center text-xs font-semibold text-gray-400">kg</span>
                </div>
                <button
                  onClick={() => {
                    const v = Math.min(400, weight + 0.1)
                    setWeight(parseFloat(v.toFixed(1)))
                    setInputVal(v.toFixed(1))
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl font-black text-gray-600 hover:bg-gray-200 active:scale-90 transition-all">
                  +
                </button>
              </div>
            </div>

            {/* Diff vs estimated */}
            {diff !== null && (
              <div className={`mt-6 rounded-xl px-4 py-3 text-sm text-center font-semibold ${
                Math.abs(diff) < 0.2 ? "bg-green-50 text-green-700" :
                diff > 0             ? "bg-orange-50 text-orange-700" :
                                       "bg-blue-50 text-blue-700"
              }`}>
                {Math.abs(diff) < 0.2
                  ? "✓ Peso dentro del rango estimado"
                  : diff > 0
                  ? `📈 ${diff.toFixed(2)} kg por encima de la estimación`
                  : `📉 ${Math.abs(diff).toFixed(2)} kg por debajo de la estimación`}
              </div>
            )}

            {/* Info box */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 leading-relaxed">
              <p className="font-semibold mb-0.5">¿Por qué registrar el peso?</p>
              El motor compara tu peso real con su estimación y ajusta automáticamente
              tu tasa metabólica basal para que los cálculos futuros sean más precisos.
            </div>

            <button
              onClick={handleSubmit}
              disabled={logWeight.isPending || !weight}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 py-4 text-sm font-bold text-white shadow-lg hover:from-blue-600 hover:to-blue-800 disabled:opacity-50 transition-all active:scale-[0.98]">
              {logWeight.isPending ? "Registrando..." : "⚖️ Registrar y ajustar metabolismo"}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <AdaptationResultCard
          result={result}
          weight={weight}
          onClose={() => setResult(null)}
        />
      )}
    </>
  )
}
