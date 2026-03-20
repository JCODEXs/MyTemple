"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import type { RouterOutputs } from "@/trpc/react"

type Client = RouterOutputs["coach"]["getClients"][number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const d    = new Date(date)
  const now  = new Date()
  const diff = now.getTime() - d.getTime()
  return Math.floor(diff / 86400000)
}

function ActivityBadge({ days }: { days: number | null }) {
  if (days === null) return (
    <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-[10px] font-bold text-gray-500">
      Sin registros
    </span>
  )
  if (days === 0) return (
    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
      Hoy ✓
    </span>
  )
  if (days <= 2) return (
    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400">
      Hace {days}d
    </span>
  )
  if (days <= 7) return (
    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
      Hace {days}d
    </span>
  )
  return (
    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
      {days}d inactivo
    </span>
  )
}

// ─── Client card ──────────────────────────────────────────────────────────────

function ClientCard({
  client,
  onView,
  onUnlink,
}: {
  client:   Client
  onView:   (id: string) => void
  onUnlink: (id: string) => void
}) {
  const days      = daysSince(client.lastLog?.date)
  const lastWeight = client.lastWeight?.weightKg
  const lastKcal   = client.lastLog?.caloriesIn
  const lastBalance = client.lastLog?.balance

  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden transition-all hover:ring-amber-500/30">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl font-black text-white shadow">
          {client.name?.[0]?.toUpperCase() ?? client.email[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white truncate">{client.name ?? client.email}</p>
          <p className="text-xs text-gray-500 truncate">{client.email}</p>
        </div>
        <ActivityBadge days={days} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-white/5 p-3">
        <div className="text-center px-2">
          <p className="text-sm font-black text-white">
            {lastWeight ? `${lastWeight.toFixed(1)}` : "—"}
          </p>
          <p className="text-[10px] text-gray-600">kg</p>
        </div>
        <div className="text-center px-2">
          <p className="text-sm font-black text-white">
            {lastKcal ? lastKcal.toFixed(0) : "—"}
          </p>
          <p className="text-[10px] text-gray-600">kcal ayer</p>
        </div>
        <div className="text-center px-2">
          <p className={`text-sm font-black ${
            lastBalance == null ? "text-gray-600" :
            lastBalance < 0 ? "text-blue-400" : "text-orange-400"
          }`}>
            {lastBalance != null
              ? `${lastBalance > 0 ? "+" : ""}${lastBalance.toFixed(0)}`
              : "—"}
          </p>
          <p className="text-[10px] text-gray-600">balance</p>
        </div>
      </div>

      {/* Profile quick info */}
      {client.profile && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-400">
            {client.profile.goal.replace("_", " ")}
          </span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-400">
            {client.profile.weightKg}kg · {client.profile.heightCm}cm
          </span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-mono text-amber-400">
            ×{client.profile.metabolicAdjustment.toFixed(3)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => onView(client.id)}
          className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors">
          Ver dashboard →
        </button>
        <button
          onClick={() => onUnlink(client.id)}
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors">
          Desvincular
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CoachClientsPage() {
  const router = useRouter()
  const utils  = api.useUtils()

  const [search,       setSearch]       = useState("")
  const [unlinkTarget, setUnlinkTarget] = useState<string | null>(null)

  const { data: clients = [], isLoading } = api.coach.getClients.useQuery()

  const unlinkClient = api.coach.unlinkClient.useMutation({
    onSuccess: () => {
      void utils.coach.getClients.invalidate()
      setUnlinkTarget(null)
      toast.success("Cliente desvinculado")
    },
    onError: (e) => toast.error(e.message),
  })

  const filtered = useMemo(() =>
    clients.filter((c) =>
      (c.name ?? c.email).toLowerCase().includes(search.toLowerCase())
    ), [clients, search]
  )

  // Summary stats
  const stats = useMemo(() => {
    const activeToday = clients.filter((c) => daysSince(c.lastLog?.date) === 0).length
    const inactive7   = clients.filter((c) => {
      const d = daysSince(c.lastLog?.date)
      return d === null || d > 7
    }).length
    return { total: clients.length, activeToday, inactive7 }
  }, [clients])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Cargando clientes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">🎓 Mis clientes</h1>
            <p className="text-xs text-gray-500">{stats.total} cliente{stats.total !== 1 ? "s" : ""} vinculados</p>
          </div>
          <button
            onClick={() => router.push("/profile")}
            className="rounded-xl bg-amber-500/20 border border-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/30 transition-colors">
            + Invitar cliente
          </button>
        </div>

        {/* Summary stats */}
        {clients.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total",         value: stats.total,       color: "text-white",       bg: "bg-white/5"          },
              { label: "Activos hoy",   value: stats.activeToday, color: "text-green-400",   bg: "bg-green-500/10"     },
              { label: "Inactivos +7d", value: stats.inactive7,   color: "text-red-400",     bg: "bg-red-500/10"       },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl ${s.bg} p-4 text-center ring-1 ring-white/10`}>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {clients.length > 3 && (
          <input
            type="text"
            placeholder="🔍 Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none mb-4"
          />
        )}

        {/* Clients grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <span className="text-6xl">{clients.length === 0 ? "👥" : "🔍"}</span>
            <h3 className="mt-4 text-lg font-bold text-gray-400">
              {clients.length === 0 ? "Sin clientes todavía" : "Sin resultados"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {clients.length === 0
                ? "Ve a tu perfil y genera un código de invitación"
                : `No hay clientes que coincidan con "${search}"`}
            </p>
            {clients.length === 0 && (
              <button
                onClick={() => router.push("/profile")}
                className="mt-5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600">
                Ir a mi perfil
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onView={(id) => router.push(`/coach/clients/${id}`)}
                onUnlink={setUnlinkTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Unlink confirm */}
      {unlinkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-[#1a1a2e] p-6 shadow-2xl ring-1 ring-white/10">
            <h3 className="font-bold text-white mb-1">¿Desvincular cliente?</h3>
            <p className="text-sm text-gray-500 mb-5">
              El cliente perderá acceso a tu seguimiento. Sus datos permanecen intactos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUnlinkTarget(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:bg-white/5">
                Cancelar
              </button>
              <button
                onClick={() => unlinkClient.mutate({ clientId: unlinkTarget })}
                disabled={unlinkClient.isPending}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
                {unlinkClient.isPending ? "..." : "Desvincular"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
