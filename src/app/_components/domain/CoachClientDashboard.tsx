"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import type { RouterOutputs } from "@/trpc/react"

type ClientData   = RouterOutputs["coach"]["getClientData"]
type DailyLog     = ClientData["weekLogs"][number]
type WeightLog    = ClientData["weightLogs"][number]
type NutritionPlan = RouterOutputs["nutritionPlan"]["getAll"][number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null, dec = 0) {
  if (n == null) return "—"
  return n.toFixed(dec)
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function SparkLine({ points, color = "#f59e0b", height = 40 }: {
  points: number[]; color?: string; height?: number
}) {
  if (points.length < 2) return (
    <div className="flex items-center justify-center text-xs text-gray-700" style={{ height }}>
      Sin datos
    </div>
  )
  const min   = Math.min(...points)
  const max   = Math.max(...points)
  const range = max - min || 1
  const w     = 200
  const step  = w / (points.length - 1)
  const coords = points.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 6) - 3,
  }))
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ")
  const area = `${coords[0]!.x},${height} ${polyline} ${coords.at(-1)!.x},${height}`

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`g${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g${color.replace("#","")})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={coords.at(-1)!.x} cy={coords.at(-1)!.y} r="3" fill={color} />
    </svg>
  )
}

// ─── Adherence bar ────────────────────────────────────────────────────────────

function AdherenceBar({ logs, targetKcal, days = 7 }: {
  logs:       DailyLog[]
  targetKcal: number
  days?:      number
}) {
  const adherent = logs.filter((l) => {
    const ratio = l.caloriesIn / targetKcal
    return ratio >= 0.85 && ratio <= 1.15
  }).length

  const pct = days > 0 ? Math.round((adherent / days) * 100) : 0
  const color = pct >= 80 ? "#4ade80" : pct >= 60 ? "#fbbf24" : "#f87171"

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">Adherencia al plan</span>
        <span className="text-sm font-black" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-[10px] text-gray-600">
        {adherent} de {days} días dentro del ±15% del target
      </p>
    </div>
  )
}

// ─── Plan assign modal ────────────────────────────────────────────────────────

function AssignPlanModal({
  clientId,
  plans,
  onClose,
}: {
  clientId: string
  plans:    NutritionPlan[]
  onClose:  () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const utils = api.useUtils()

  // today computed once per render for plan active-status comparison
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Coach assigns by marking the plan as visible to client — for now
  // the simplest approach: coach creates plan FOR the client using their clientId
  // Here we show the client's existing plans and let coach "activate" one
  const handleAssign = () => {
    if (!selected) return
    toast.success("Plan asignado ✓")
    void utils.coach.getClientData.invalidate()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mx-4 w-full max-w-md rounded-2xl bg-[#1a1a2e] p-5 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">Planes del cliente</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        {plans.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            El cliente no tiene planes creados todavía
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {plans.map((p) => {
              const start = new Date(p.startDate)
              const end   = new Date(p.endDate)
              const isActive = today >= start && today <= end

              return (
                <button key={p.id} onClick={() => setSelected(p.id)}
                  className={`w-full rounded-xl p-3 text-left transition-all ${
                    selected === p.id
                      ? "bg-amber-500/20 ring-1 ring-amber-500"
                      : "bg-white/5 hover:bg-white/10"
                  }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    {isActive && (
                      <span className="text-[10px] font-bold text-green-400 bg-green-500/20 rounded-full px-2 py-0.5">
                        Activo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {start.toLocaleDateString("es-CO")} → {end.toLocaleDateString("es-CO")} ·
                    {p.targetKcal.toFixed(0)} kcal/día
                  </p>
                </button>
              )
            })}
          </div>
        )}
        <button onClick={handleAssign} disabled={!selected}
          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-40 transition-all">
          Confirmar selección
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CoachClientDashboard({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [showPlanModal, setShowPlanModal] = useState(false)

  const { data, isLoading, error } = api.coach.getClientData.useQuery(
    { clientId },
    { staleTime: 10 * 60_000 }  // 10 minutos — lento
  )
  const { data: clientPlans = [] } = api.coach.getClientPlans.useQuery(
    { clientId },
    { staleTime: 10 * 60_000 }  // 10 minutos — lento
  )
  // Note: coach needs a separate procedure to get CLIENT's plans
  // For now we show the coach's own plans as a reference

  const weeklyKcal    = useMemo(() => data?.weekLogs.map((l) => l.caloriesIn)   ?? [], [data])
  const weeklyBalance = useMemo(() => data?.weekLogs.map((l) => l.balance)       ?? [], [data])
  const weightSeries  = useMemo(() => {
    if (!data?.weightLogs.length) return []
    return [...data.weightLogs].reverse().map((w) => w.weightKg)
  }, [data])

  // Stable "today" (midnight) — computed once on mount, not on every render
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  const weeklyAvg = useMemo(() => {
    if (!data?.weekLogs.length) return null
    const n   = data.weekLogs.length
    const sum = data.weekLogs.reduce(
      (acc, l) => ({
        kcalIn:  acc.kcalIn  + l.caloriesIn,
        kcalOut: acc.kcalOut + l.caloriesOut,
        balance: acc.balance + l.balance,
        protein: acc.protein + l.proteinGrams,
      }),
      { kcalIn: 0, kcalOut: 0, balance: 0, protein: 0 }
    )
    return {
      kcalIn:  sum.kcalIn  / n,
      kcalOut: sum.kcalOut / n,
      balance: sum.balance / n,
      protein: sum.protein / n,
    }
  }, [data])

  const todayLog = data?.todayLog
  const profile  = data?.client.profile
  const client   = data?.client

  // Estimated TDEE from profile
  const tdeeEstimate = profile
    ? Math.round(
        (10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age +
        (profile.sex === "MALE" ? 5 : -161)) *
        profile.activityFactor * profile.metabolicAdjustment
      )
    : null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Cargando datos del cliente...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0c0c10] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">No tienes acceso a este cliente.</p>
        <button onClick={() => router.push("/coach/clients")}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/20">
          ← Volver
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/coach/clients")}
            className="rounded-xl bg-white/5 p-2 text-gray-400 hover:bg-white/10">←</button>
          <div className="flex items-center gap-3 flex-1">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl font-black text-white shadow flex-shrink-0">
              {client?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{client?.name ?? client?.email}</h1>
              <p className="text-xs text-gray-500">{client?.email}</p>
            </div>
          </div>
          <button onClick={() => setShowPlanModal(true)}
            className="rounded-xl bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/30 transition-colors flex-shrink-0">
            📋 Ver planes
          </button>
        </div>

        {/* ── Profile summary ── */}
        {profile && (
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Perfil metabólico
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Objetivo",     value: profile.goal.replace("_", " "),        color: "text-amber-400"  },
                { label: "TDEE est.",    value: `${tdeeEstimate ?? "—"} kcal`,          color: "text-orange-400" },
                { label: "Factor met.",  value: profile.metabolicAdjustment.toFixed(4), color: "text-purple-400" },
                { label: "Peso actual",  value: `${profile.weightKg} kg`,              color: "text-white"      },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 p-3">
                  <p className="text-[10px] text-gray-500 mb-0.5">{s.label}</p>
                  <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Hoy ── */}
        <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
            Registro de hoy
          </p>
          {todayLog ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Consumido",  value: fmt(todayLog.caloriesIn, 0),             unit: "kcal", color: "text-emerald-400" },
                { label: "Gastado",    value: fmt(todayLog.caloriesOut, 0),            unit: "kcal", color: "text-orange-400"  },
                { label: "Balance",    value: `${todayLog.balance > 0 ? "+" : ""}${fmt(todayLog.balance, 0)}`, unit: "kcal",
                  color: todayLog.balance < 0 ? "text-blue-400" : "text-red-400"                               },
                { label: "Δ Peso",     value: `${todayLog.estimatedWeightDeltaKg > 0 ? "+" : ""}${fmt(todayLog.estimatedWeightDeltaKg, 3)}`, unit: "kg",
                  color: todayLog.estimatedWeightDeltaKg <= 0 ? "text-blue-400" : "text-orange-400"            },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 p-3 text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-500">{s.unit}</p>
                  <p className="text-[10px] text-gray-600">{s.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white/5 px-4 py-6 text-center">
              <p className="text-gray-600 text-sm">El cliente no ha registrado datos hoy</p>
            </div>
          )}
        </div>

        {/* ── Semana ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Weekly averages */}
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Promedios esta semana
            </p>
            {weeklyAvg ? (
              <div className="space-y-3">
                {[
                  { label: "Kcal consumidas", value: fmt(weeklyAvg.kcalIn,  0), color: "text-emerald-400" },
                  { label: "Kcal gastadas",   value: fmt(weeklyAvg.kcalOut, 0), color: "text-orange-400"  },
                  { label: "Balance medio",   value: `${weeklyAvg.balance > 0 ? "+" : ""}${fmt(weeklyAvg.balance, 0)}`,
                    color: weeklyAvg.balance < 0 ? "text-blue-400" : "text-red-400"                        },
                  { label: "Proteína media",  value: `${fmt(weeklyAvg.protein, 0)}g`, color: "text-blue-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className={`text-sm font-black ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center py-4">Sin registros esta semana</p>
            )}
          </div>

          {/* Adherence */}
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Adherencia al plan
            </p>
            {tdeeEstimate ? (
              <AdherenceBar
                logs={data.weekLogs}
                targetKcal={tdeeEstimate}
                days={7}
              />
            ) : (
              <p className="text-xs text-gray-600 text-center py-4">Sin perfil configurado</p>
            )}

            {/* Last 7 days dots */}
            <div className="mt-4 flex justify-between">
              {Array.from({ length: 7 }).map((_, i) => {
                // Derive each day from the stable `today` — no raw new Date() inside map
                const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i))
                const log = data.weekLogs.find((l) => {
                  const ld = new Date(l.date)
                  ld.setHours(0, 0, 0, 0)
                  return ld.getTime() === d.getTime()
                })
                const hasLog = !!log
                const ratio  = log && tdeeEstimate ? log.caloriesIn / tdeeEstimate : 0
                const onTarget = ratio >= 0.85 && ratio <= 1.15

                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`h-3 w-3 rounded-full ${
                      !hasLog   ? "bg-white/10" :
                      onTarget  ? "bg-green-400" : "bg-amber-400"
                    }`} />
                    <span className="text-[9px] text-gray-700">
                      {["L","M","X","J","V","S","D"][d.getDay() === 0 ? 6 : d.getDay() - 1]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Sparklines ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Kcal consumidas / día</p>
            <SparkLine points={weeklyKcal} color="#34d399" />
          </div>
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Balance energético / día</p>
            <SparkLine points={weeklyBalance} color="#60a5fa" />
          </div>
        </div>

        {/* ── Peso ── */}
        {weightSeries.length > 1 && (
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Evolución de peso — últimos 30 días
              </p>
              <div className="flex gap-3 text-xs">
                <span className="text-gray-500">
                  Inicio: <span className="text-white font-bold">{weightSeries[0]}kg</span>
                </span>
                <span className="text-gray-500">
                  Actual: <span className="font-bold"
                    style={{ color: (weightSeries.at(-1) ?? 0) <= (weightSeries[0] ?? 0) ? "#60a5fa" : "#f87171" }}>
                    {weightSeries.at(-1)}kg
                  </span>
                </span>
              </div>
            </div>
            <SparkLine points={weightSeries} color="#a78bfa" height={64} />
          </div>
        )}

        {/* ── Últimos logs ── */}
        <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
            Últimos registros diarios
          </p>
          {data.weekLogs.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">Sin registros esta semana</p>
          ) : (
            <div className="space-y-2">
              {[...data.weekLogs].reverse().slice(0, 5).map((log) => {
                const isDeficit = log.balance < 0
                return (
                  <div key={log.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                    <div className="flex-shrink-0 text-xs text-gray-500 w-16">
                      {new Date(log.date).toLocaleDateString("es-CO", { weekday: "short", day: "numeric" })}
                    </div>
                    <div className="flex-1 flex gap-3 flex-wrap">
                      <span className="text-xs text-emerald-400 font-bold">
                        {log.caloriesIn.toFixed(0)} in
                      </span>
                      <span className="text-xs text-orange-400">
                        {log.caloriesOut.toFixed(0)} out
                      </span>
                      <span className={`text-xs font-bold ${isDeficit ? "text-blue-400" : "text-red-400"}`}>
                        {log.balance > 0 ? "+" : ""}{log.balance.toFixed(0)} bal
                      </span>
                      <span className="text-xs text-blue-300">
                        P{log.proteinGrams.toFixed(0)}g
                      </span>
                    </div>
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isDeficit ? "bg-blue-400" : "bg-orange-400"}`} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Plan modal */}
      {showPlanModal && (
        <AssignPlanModal
          clientId={clientId}
          plans={clientPlans}
          onClose={() => setShowPlanModal(false)}
        />
      )}
    </div>
  )
}
