"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/trpc/react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayOfWeek(d = new Date()) {
  const day  = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const mon  = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function fmt(n: number | undefined | null, dec = 0) {
  if (n == null) return "—"
  return n.toFixed(dec)
}

function pct(part: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((part / total) * 100))
}

// ─── Tiny SVG line chart ──────────────────────────────────────────────────────

function SparkLine({
  points,
  color = "#f59e0b",
  height = 48,
  width = 200,
}: {
  points: number[]
  color?: string
  height?: number
  width?: number
}) {
  if (points.length < 2) return (
    <div className="flex items-center justify-center h-12 text-xs text-gray-600">
      Sin datos suficientes
    </div>
  )

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = width / (points.length - 1)

  const coords = points.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }))

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ")
  const area = `${coords[0]!.x},${height} ` + polyline + ` ${coords[coords.length - 1]!.x},${height}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* last point dot */}
      <circle cx={coords[coords.length - 1]!.x} cy={coords[coords.length - 1]!.y} r="3" fill={color} />
    </svg>
  )
}

// ─── Ring progress ────────────────────────────────────────────────────────────

function Ring({
  value,
  max,
  size = 72,
  stroke = 7,
  color,
  label,
  sublabel,
}: {
  value: number; max: number; size?: number; stroke?: number
  color: string; label: string; sublabel: string
}) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = pct(value, max) / 100 * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke="#ffffff10" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black text-white">{pct(value, max)}%</span>
        </div>
      </div>
      <p className="text-xs font-bold text-white">{label}</p>
      <p className="text-[10px] text-gray-500">{sublabel}</p>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, unit, sub, accent }: {
  icon: string; label: string; value: string
  unit?: string; sub?: string; accent: string
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: accent }}>{label}</span>
      </div>
      <p className="text-2xl font-black text-white leading-none">
        {value}<span className="ml-1 text-sm font-normal text-gray-400">{unit}</span>
      </p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

// ─── Macro bar ────────────────────────────────────────────────────────────────

function MacroRow({ label, value, target, unit, color, emoji }: {
  label: string; value: number; target: number
  unit: string; color: string; emoji: string
}) {
  const p = pct(value, target)
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <span>{emoji}</span>{label}
        </span>
        <span className="text-xs font-bold text-white">{fmt(value, 1)}{unit}
          <span className="text-gray-600 font-normal"> / {fmt(target, 0)}{unit}</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickAction({ icon, label, href, accent }: {
  icon: string; label: string; href: string; accent: string
}) {
  const router = useRouter()
  return (
    <button onClick={() => router.push(href)}
      className="flex flex-col items-center gap-2 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95 ring-1 ring-white/10 hover:ring-white/20"
      style={{ background: `${accent}18` }}>
      <span className="text-2xl">{icon}</span>
      <span className="text-[11px] font-semibold text-gray-300 text-center leading-tight">{label}</span>
    </button>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
 // estable durante toda la vida del componente
const { today, weekStart, weekEnd, thirtyDaysAgo } = useMemo(() => {
  const now = new Date()

  // Normalizar a medianoche local — crítico para @db.Date
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const weekStart = getMondayOfWeek(today)
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 29)

  return { today, weekStart, weekEnd, thirtyDaysAgo }
}, []) // [] = se calcula solo una vez al montar

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: profile  } = api.userProfile.getSummary.useQuery(
    undefined,
    { staleTime: 10 * 60_000 }  // 10 minutos — cambia poco
  )
  
  const { data: todayLog } = api.dailyLog.getDay.useQuery(
    { date: today },
    { staleTime: 30_000 }       // 30 segundos — tiempo real
  )
  const { data: weekly   } = api.dailyLog.getWeeklySummary.useQuery(
    { weekStart },
    { staleTime: 5 * 60_000 }   // 5 minutos — moderado
  )
  const { data: weekLogs } = api.dailyLog.getRange.useQuery(
    { from: weekStart, to: weekEnd },
    { staleTime: 5 * 60_000 }   // 5 minutos — moderado
  )
  const { data: monthLogs } = api.dailyLog.getRange.useQuery(
    { from: thirtyDaysAgo, to: today },
    { staleTime: 5 * 60_000 }   // 5 minutos — moderado
  )


  // // Last 30 days for weight sparkline — reuse getRange from dailyLog
  // const thirtyDaysAgo = new Date(today)
  // thirtyDaysAgo.setDate(today.getDate() - 29)
  // const { data: monthLogs } = api.dailyLog.getRange.useQuery({
  //   from: thirtyDaysAgo,
  //   to:   today,
  // })

  // ── Derived values ─────────────────────────────────────────────────────────
  const userName = profile?.user?.name?.split(" ")[0] ?? "atleta"
  // Estimated weight series from cumulative deltas
  const weightSeries = useMemo(() => {
    if (!monthLogs || !profile) return []
    const base = profile.latestLoggedWeight ?? profile.weightKg
    let acc = base
    return monthLogs.map((log) => {
      acc += log.estimatedWeightDeltaKg
      return parseFloat(acc.toFixed(2))
    })
  }, [monthLogs, profile])

  // Weekly kcal series for sparkline
  const weeklyKcalIn  = useMemo(() =>
    weekLogs?.map((l) => l.caloriesIn) ?? [], [weekLogs])
  const weeklyBalance = useMemo(() =>
    weekLogs?.map((l) => l.balance) ?? [], [weekLogs])
   // BMR calculado desde profile (no viene en DailyLog)
  const bmrEstimate = profile
    ? Math.round(
        (10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age +
        (profile.sex === "MALE" ? 5 : -161)) * profile.metabolicAdjustment
      )
    : null

  // NEAT = gasto total - BMR
  const neatEstimate = todayLog && bmrEstimate
    ? Math.round(todayLog.caloriesOut - bmrEstimate)
    : null

  // Target macros from profile goal + TDEE estimate
  const tdeeEstimate = profile
    ? Math.round((10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age +
        (profile.sex === "MALE" ? 5 : -161)) * profile.activityFactor * profile.metabolicAdjustment)
    : 2000

  const macroTargets = {
    protein: Math.round((tdeeEstimate * 0.30) / 4),
    carbs:   Math.round((tdeeEstimate * 0.45) / 4),
    fat:     Math.round((tdeeEstimate * 0.25) / 9),
  }

  // Accumulated energy split (BMR vs training) from week
  const accBMR = useMemo(() => {
    if (!weekLogs || !profile) return 0
    const bmr = (10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age +
      (profile.sex === "MALE" ? 5 : -161)) * profile.metabolicAdjustment
    return Math.round(bmr * weekLogs.length)
  }, [weekLogs, profile])

  const accTraining = useMemo(() => {
    if (!weekLogs) return 0
    const totalOut = weekLogs.reduce((s, l) => s + l.caloriesOut, 0)
    return Math.round(totalOut - accBMR)
  }, [weekLogs, accBMR])

  const accIn = useMemo(() =>
    weekLogs?.reduce((s, l) => s + l.caloriesIn, 0) ?? 0, [weekLogs])

  // Hydration target
  const hydrationTargetMl = profile
    ? Math.round(profile.weightKg * 35)
    : 2500

  const isDeficit = (todayLog?.balance ?? 0) < 0
  const balanceColor = isDeficit ? "#60a5fa" : "#f87171"
  const balanceLabel = isDeficit ? "Déficit" : "Superávit"

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              {today.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-2xl font-black text-white">
              Hola, {userName ?? "atleta"} ⚡
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-400 ring-1 ring-white/10">
              {profile?.goal?.replace("_", " ") ?? "—"}
            </div>
          </div>
        </div>

        {/* ── Hero: Balance del día ── */}
        <div className="rounded-3xl p-5 ring-1 ring-white/10 overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
          {/* Background glow */}
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl opacity-20"
            style={{ background: isDeficit ? "#3b82f6" : "#ef4444" }} />

          <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Balance central */}
            <div className="sm:col-span-1 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">
                Balance hoy
              </p>
              <p className="text-5xl font-black leading-none" style={{ color: balanceColor }}>
                {(todayLog?.balance ?? 0) > 0 ? "+" : ""}
                {fmt(todayLog?.balance, 0)}
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: balanceColor }}>
                kcal · {balanceLabel}
              </p>
              <p className="mt-3 text-xs text-gray-600">
                Δ peso est. {todayLog
                  ? `${todayLog.estimatedWeightDeltaKg > 0 ? "+" : ""}${todayLog.estimatedWeightDeltaKg.toFixed(3)} kg`
                  : "—"}
              </p>
            </div>

            {/* In vs Out */}
            <div className="sm:col-span-2 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mb-1">
                  🍽️ Consumido
                </p>
                <p className="text-3xl font-black text-white">
                  {fmt(todayLog?.caloriesIn, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">kcal</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-orange-400 font-semibold mb-1">
                  🔥 Gastado
                </p>
                <p className="text-3xl font-black text-white">
                  {fmt(todayLog?.caloriesOut, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">kcal · TDEE</p>
              </div>
              {/* Mini rings BMR vs TDEE */}
              <div className="col-span-2 flex justify-around items-center rounded-2xl bg-white/5 px-4 py-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">❤️ BMR</p>
                  <p className="text-base font-black text-white">{fmt(bmrEstimate,0)??"-"}</p>
                  <p className="text-[10px] text-gray-600">kcal base</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">⚡ NEAT</p>
                  <p className="text-base font-black text-white">
                    {profile ? fmt(neatEstimate,0) : "—"}
                  </p>
                  <p className="text-[10px] text-gray-600">kcal actividad</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">🏋️ Training</p>
                  <p className="text-base font-black text-amber-400">
                    {todayLog?.workouts?.[0]
                      ? fmt(todayLog.workouts[0].realKcal ?? todayLog.workouts[0].estimatedKcal, 0)
                      : "—"}
                  </p>
                  <p className="text-[10px] text-gray-600">kcal quemadas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Macros + Hidratación ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Macros */}
          <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
              📊 Macros del día
            </p>
            <MacroRow label="Proteína"       value={todayLog?.proteinGrams ?? 0}
              target={macroTargets.protein} unit="g" color="#60a5fa" emoji="💪" />
            <MacroRow label="Carbohidratos"  value={todayLog?.carbsGrams ?? 0}
              target={macroTargets.carbs}   unit="g" color="#fbbf24" emoji="🌾" />
            <MacroRow label="Grasas"         value={todayLog?.fatGrams ?? 0}
              target={macroTargets.fat}     unit="g" color="#f87171" emoji="🥑" />

            {/* Macro rings */}
            <div className="flex justify-around pt-2">
              <Ring value={todayLog?.proteinGrams ?? 0} max={macroTargets.protein}
                color="#60a5fa" label="Prot" sublabel={`${macroTargets.protein}g`} />
              <Ring value={todayLog?.carbsGrams ?? 0} max={macroTargets.carbs}
                color="#fbbf24" label="Carbs" sublabel={`${macroTargets.carbs}g`} />
              <Ring value={todayLog?.fatGrams ?? 0} max={macroTargets.fat}
                color="#f87171" label="Grasa" sublabel={`${macroTargets.fat}g`} />
            </div>
          </div>

          {/* Hidratación + peso actual */}
          <div className="space-y-4">
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                💧 Hidratación recomendada hoy
              </p>
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-4xl font-black text-cyan-400">
                    {(hydrationTargetMl / 1000).toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">litros recomendados</p>
                </div>
                <div className="flex-1 ml-2">
                  <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                      style={{ width: "100%" }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {profile?.weightKg ?? "—"}kg × 35ml + entrenamiento
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                ⚖️ Peso estimado hoy
              </p>
              <p className="text-4xl font-black text-white">
                {fmt(profile?.estimatedCurrentWeight, 1)}
                <span className="text-lg font-normal text-gray-400 ml-1">kg</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Último registrado: {fmt(profile?.latestLoggedWeight, 1)} kg
              </p>
            </div>
          </div>
        </div>

        {/* ── Row 3: Acumulado semanal de energía ── */}
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
            ⚡ Energía acumulada esta semana
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            <StatCard icon="🍽️" label="Consumido"  value={fmt(accIn, 0)}      unit="kcal" accent="#34d399"
              sub={`${fmt(accIn / Math.max(weekLogs?.length ?? 1, 1), 0)} kcal/día`} />
            <StatCard icon="❤️" label="TMB acum."  value={fmt(accBMR, 0)}      unit="kcal" accent="#f472b6"
              sub="Tasa metabólica basal" />
            <StatCard icon="🏋️" label="Training"   value={fmt(accTraining, 0)} unit="kcal" accent="#fbbf24"
              sub="Por encima del TMB" />
            <StatCard icon="⚖️" label="Balance"    value={fmt(accIn - accBMR - accTraining, 0)} unit="kcal"
              accent={accIn - accBMR - accTraining < 0 ? "#60a5fa" : "#f87171"}
              sub={accIn - accBMR - accTraining < 0 ? "Déficit semanal" : "Superávit semanal"} />
          </div>

          {/* Sparklines */}
          {weeklyKcalIn.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Kcal consumidas / día</p>
                <SparkLine points={weeklyKcalIn} color="#34d399" />
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Balance / día</p>
                <SparkLine points={weeklyBalance} color={balanceColor} />
              </div>
            </div>
          )}
        </div>

        {/* ── Row 4: Evolución del peso ── */}
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
              📈 Evolución del peso — últimos 30 días
            </p>
            {weightSeries.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">
                  Inicio: <span className="text-white font-bold">{weightSeries[0]}kg</span>
                </span>
                <span className="text-gray-500">
                  Hoy: <span className="font-bold"
                    style={{ color: (weightSeries.at(-1) ?? 0) < (weightSeries[0] ?? 0) ? "#60a5fa" : "#f87171" }}>
                    {weightSeries.at(-1)}kg
                  </span>
                </span>
              </div>
            )}
          </div>
          {weightSeries.length > 1 ? (
            <SparkLine points={weightSeries} color="#a78bfa" height={72} width={800} />
          ) : (
            <div className="flex flex-col items-center py-8 text-gray-600 text-sm">
              <span className="text-3xl mb-2">📊</span>
              Registra días para ver la tendencia de peso
            </div>
          )}
        </div>

        {/* ── Row 5: Resumen semanal ── */}
        {weekly && (
          <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
              📅 Promedios semanales
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon="🔥" label="Kcal/día"   value={fmt(weekly.averages.caloriesIn, 0)}    unit="kcal" accent="#f97316" />
              <StatCard icon="💪" label="Proteína"   value={fmt(weekly.averages.proteinGrams, 1)}  unit="g/día" accent="#60a5fa" />
              <StatCard icon="🌾" label="Carbos"     value={fmt(weekly.averages.carbsGrams, 1)}    unit="g/día" accent="#fbbf24" />
              <StatCard icon="⚖️" label="Δ Peso"     value={`${weekly.totalEstimatedWeightDeltaKg > 0 ? "+" : ""}${fmt(weekly.totalEstimatedWeightDeltaKg, 3)}`} unit="kg" accent="#a78bfa"
                sub={`${weekly.days} días registrados`} />
            </div>
          </div>
        )}

        {/* ── Row 6: Accesos rápidos ── */}
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
            🚀 Acciones rápidas
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <QuickAction icon="📋" label="Registrar día"    href="/log"          accent="#f97316" />
            <QuickAction icon="⚖️" label="Registrar peso"  href="/weight"        accent="#60a5fa" />
            <QuickAction icon="📚" label="Mis recetas"      href="/library"       accent="#a78bfa" />
            <QuickAction icon="🍳" label="Nueva receta"     href="/recipe"   accent="#34d399" />
            <QuickAction icon="🧺" label="Ingredientes"     href="/ingredients"   accent="#fbbf24" />
            <QuickAction icon="👤" label="Mi perfil"        href="/profile"       accent="#f472b6" />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-700 pb-4">
          Factor metabólico actual: <span className="text-gray-500 font-mono">
            {fmt(profile?.metabolicAdjustment, 4)}
          </span> · se ajusta automáticamente al registrar tu peso
        </p>
      </div>
    </div>
  )
}
