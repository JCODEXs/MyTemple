"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import type { RouterOutputs } from "@/trpc/react"

type Plan     = RouterOutputs["nutritionPlan"]["getAll"][number]
type PlanFull = RouterOutputs["nutritionPlan"]["getOne"]
type PlanDay  = PlanFull["days"][number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEAL_TYPE_META: Record<string, { label: string; emoji: string; order: number }> = {
  BREAKFAST: { label: "Desayuno",   emoji: "🌅", order: 0 },
  LUNCH:     { label: "Almuerzo",   emoji: "☀️", order: 1 },
  DINNER:    { label: "Cena",       emoji: "🌙", order: 2 },
  SNACK:     { label: "Snack",      emoji: "🍎", order: 3 },
}

function MacroMini({ proteinG, carbsG, fatG }: { proteinG: number; carbsG: number; fatG: number }) {
  const total = (proteinG * 4 + carbsG * 4 + fatG * 9) || 1
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/5 flex mt-1">
      <div style={{ width: `${(proteinG * 4 / total) * 100}%` }} className="bg-blue-400" />
      <div style={{ width: `${(carbsG   * 4 / total) * 100}%` }} className="bg-amber-400" />
      <div style={{ width: `${(fatG     * 9 / total) * 100}%` }} className="bg-rose-400" />
    </div>
  )
}

// ─── Plan card (list view) ────────────────────────────────────────────────────

function PlanCard({ plan, onSelect, onDelete, isActive }: {
  plan:     Plan
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  isActive: boolean
}) {
  const start = new Date(plan.startDate)
  const end   = new Date(plan.endDate)
  const today = new Date()
  const isCurrent = today >= start && today <= end

  return (
    <div
      onClick={() => onSelect(plan.id)}
      className={`cursor-pointer rounded-2xl p-4 ring-1 transition-all hover:ring-amber-500/50 ${
        isActive ? "bg-amber-500/10 ring-amber-500/50" : "bg-white/5 ring-white/10 hover:bg-white/10"
      }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white truncate">{plan.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {start.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} →{" "}
            {end.toLocaleDateString("es-CO",   { day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isCurrent && (
            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
              Activo
            </span>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(plan.id) }}
            className="rounded-lg bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20">
            🗑
          </button>
        </div>
      </div>
      <div className="mt-2 flex gap-3 text-xs">
        <span className="text-orange-400 font-bold">{plan.targetKcal.toFixed(0)} kcal/día</span>
        <span className="text-gray-600">·</span>
        <span className="text-blue-400">P {Math.round(plan.targetKcal * plan.proteinPct / 4)}g</span>
        <span className="text-amber-400">C {Math.round(plan.targetKcal * plan.carbsPct / 4)}g</span>
        <span className="text-rose-400">G {Math.round(plan.targetKcal * plan.fatPct / 9)}g</span>
      </div>
    </div>
  )
}

// ─── Day detail modal ─────────────────────────────────────────────────────────

function DayDetailModal({
  day,
  targetKcal,
  realLog,
  onClose,
  onLogFromPlan,
}: {
  day:          PlanDay
  targetKcal:   number
  realLog:      RouterOutputs["dailyLog"]["getDay"]
  onClose:      () => void
  onLogFromPlan: () => void
}) {
  const planned  = day.totals
  const real     = realLog
  const hasReal  = !!real

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-t-3xl bg-[#0c0c10] shadow-2xl sm:rounded-3xl overflow-hidden ring-1 ring-white/10"
        style={{ maxHeight: "92vh" }}>

        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-black text-white">
              {new Date(day.date).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <button onClick={onClose} className="rounded-full bg-white/10 p-1.5 text-gray-400">✕</button>
          </div>

          {/* Plan vs Real comparison */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              { label: "Plan",        data: planned,  color: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30" },
              { label: hasReal ? "Real" : "Sin registro", data: real ?? null, color: "from-blue-500/20 to-blue-600/20", border: "border-blue-500/30" },
            ].map(({ label, data, color, border }) => (
              <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} border ${border} p-3`}>
                <p className="text-[10px] font-bold text-gray-400 mb-1">{label}</p>
                <p className="text-2xl font-black text-white">
                  {data ? Math.round(data.caloriesIn ?? data.kcal ?? 0) : "—"}
                  <span className="text-xs font-normal text-gray-400 ml-0.5">kcal</span>
                </p>
                {data && (
                  <MacroMini
                    proteinG={(data as any).proteinGrams ?? (data as any).proteinG ?? 0}
                    carbsG={(data as any).carbsGrams ?? (data as any).carbsG ?? 0}
                    fatG={(data as any).fatGrams ?? (data as any).fatG ?? 0}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Meals */}
        <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: "50vh" }}>
          {[...day.meals]
            .sort((a, b) => (MEAL_TYPE_META[a.mealType]?.order ?? 0) - (MEAL_TYPE_META[b.mealType]?.order ?? 0))
            .map((meal) => {
              const meta = MEAL_TYPE_META[meal.mealType] ?? { label: meal.mealType, emoji: "🍽️" }
              return (
                <div key={meal.id} className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs font-bold text-gray-400 mb-2">{meta.emoji} {meta.label}</p>
                  {meal.recipes.map((mr) => (
                    <div key={mr.mealRecipeId} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{mr.recipeName}</p>
                        <p className="text-xs text-gray-500">
                          {mr.servings.toFixed(1)} p · {mr.kcal.toFixed(0)} kcal ·
                          P{mr.proteinG.toFixed(0)} C{mr.carbsG.toFixed(0)} G{mr.fatG.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between text-xs pt-1 border-t border-white/5">
                    <span className="text-gray-600">Total {meta.label}</span>
                    <span className="text-orange-400 font-bold">{meal.totals.kcal.toFixed(0)} kcal</span>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Footer action */}
        <div className="p-4 border-t border-white/10">
          {!hasReal ? (
            <button onClick={onLogFromPlan}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-white hover:from-amber-600 hover:to-orange-600 transition-all">
              📋 Registrar este día (pre-cargado con el plan)
            </button>
          ) : (
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-center text-sm text-green-400 font-semibold">
              ✓ Día registrado
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Weekly grid ──────────────────────────────────────────────────────────────

function WeeklyGrid({ plan, onDayClick }: {
  plan:       PlanFull
  onDayClick: (day: PlanDay) => void
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
        <div key={d} className="text-center text-[10px] font-bold text-gray-600 pb-1">{d}</div>
      ))}
      {plan.days.map((day) => {
        const t     = day.totals
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dayDate = new Date(day.date)
        const isToday = dayDate.getTime() === today.getTime()
        const isPast  = dayDate < today

        return (
          <button key={day.id} onClick={() => onDayClick(day)}
            className={`rounded-xl p-2 text-center transition-all hover:ring-1 hover:ring-amber-500 ${
              isToday ? "bg-amber-500/20 ring-1 ring-amber-500" :
              isPast  ? "bg-white/5 opacity-70" : "bg-white/5"
            }`}>
            <p className="text-[10px] text-gray-500">
              {dayDate.getDate()}
            </p>
            <p className="text-sm font-black text-white">{t.kcal.toFixed(0)}</p>
            <MacroMini proteinG={t.proteinG} carbsG={t.carbsG} fatG={t.fatG} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlanViewer() {
  const router = useRouter()
  const utils  = api.useUtils()

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedDay,    setSelectedDay]    = useState<PlanDay | null>(null)
  const [deleteTarget,   setDeleteTarget]   = useState<string | null>(null)

  const { data: plans = [], isLoading } = api.nutritionPlan.getAll.useQuery()
  const { data: planFull } = api.nutritionPlan.getOne.useQuery(
    { planId: selectedPlanId! },
    { enabled: !!selectedPlanId }
  )

  // Real log for selected day
  const { data: realLog } = api.dailyLog.getDay.useQuery(
    { date: selectedDay ? new Date(selectedDay.date) : new Date() },
    { enabled: !!selectedDay }
  )

  const deletePlan = api.nutritionPlan.delete.useMutation({
    onSuccess: () => {
      void utils.nutritionPlan.getAll.invalidate()
      if (deleteTarget === selectedPlanId) setSelectedPlanId(null)
      setDeleteTarget(null)
      toast.success("Plan eliminado")
    },
    onError: (e) => toast.error(e.message),
  })

  const activePlan = useMemo(() => {
    const today = new Date()
    return plans.find((p) => new Date(p.startDate) <= today && new Date(p.endDate) >= today)
  }, [plans])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Cargando planes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white p-4 md:p-6">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">📅 Planes nutricionales</h1>
            <p className="text-xs text-gray-500">{plans.length} plan{plans.length !== 1 ? "es" : ""} guardado{plans.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => router.push("/plans/new")}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:from-amber-600 hover:to-orange-600 transition-all">
            + Nuevo plan
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <span className="text-6xl">📅</span>
            <h3 className="mt-4 text-lg font-bold text-gray-400">Sin planes todavía</h3>
            <p className="text-sm text-gray-600 mt-1">Crea tu primer plan nutricional semanal</p>
            <button onClick={() => router.push("/plans/new")}
              className="mt-5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600">
              + Crear plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Plan list */}
            <div className="space-y-3 lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Tus planes</p>
              {plans.map((plan) => (
                <PlanCard key={plan.id}
                  plan={plan}
                  isActive={selectedPlanId === plan.id}
                  onSelect={setSelectedPlanId}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>

            {/* Plan detail */}
            <div className="lg:col-span-2">
              {planFull ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-black text-white">{planFull.name}</h2>
                      <span className="text-xs text-gray-500">
                        {planFull.days.length} días
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Kcal/día",  value: planFull.targetKcal.toFixed(0),                    color: "text-orange-400" },
                        { label: "Prot",      value: `${Math.round(planFull.targetKcal * planFull.proteinPct / 4)}g`, color: "text-blue-400"   },
                        { label: "Carbs",     value: `${Math.round(planFull.targetKcal * planFull.carbsPct   / 4)}g`, color: "text-amber-400"  },
                        { label: "Grasa",     value: `${Math.round(planFull.targetKcal * planFull.fatPct     / 9)}g`, color: "text-rose-400"   },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl bg-white/5 p-3 text-center">
                          <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                          <p className="text-[10px] text-gray-500">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weekly grid */}
                  <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                      Vista semanal — clic en un día para el detalle
                    </p>
                    <WeeklyGrid plan={planFull} onDayClick={setSelectedDay} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-gray-600">
                  <span className="text-4xl">👈</span>
                  <p className="mt-2 text-sm">Selecciona un plan para ver el detalle</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Day detail modal */}
      {selectedDay && planFull && (
        <DayDetailModal
          day={selectedDay}
          targetKcal={planFull.targetKcal}
          realLog={realLog ?? null}
          onClose={() => setSelectedDay(null)}
          onLogFromPlan={() => {
            const date = new Date(selectedDay.date)
            router.push(`/log?date=${date.toISOString().slice(0, 10)}`)
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-[#1a1a2e] p-6 shadow-2xl ring-1 ring-white/10">
            <h3 className="font-bold text-white mb-2">¿Eliminar plan?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-gray-400 hover:bg-white/5">
                Cancelar
              </button>
              <button onClick={() => deletePlan.mutate({ planId: deleteTarget })}
                disabled={deletePlan.isPending}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
                {deletePlan.isPending ? "..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
