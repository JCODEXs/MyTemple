/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
"use client"

import { useState, useMemo } from "react"
import { toast }             from "sonner"
import { api }               from "@/trpc/react"
import type { RouterOutputs } from "@/trpc/react"
import type { UserRole, SubscriptionStatus } from "../../../../generated/prisma"

type User = RouterOutputs["admin"]["getUsers"]["users"][number]
type Sub  = RouterOutputs["admin"]["getSubscriptions"][number]
type Code = RouterOutputs["admin"]["getCodes"][number]

const ROLE_META = {
  USER:  { label: "Usuario",  color: "bg-blue-500/20 text-blue-400",   dot: "bg-blue-400"   },
  COACH: { label: "Coach",    color: "bg-amber-500/20 text-amber-400", dot: "bg-amber-400"  },
  ADMIN: { label: "Admin",    color: "bg-purple-500/20 text-purple-400", dot: "bg-purple-400" },
}

const STATUS_META = {
  ACTIVE:    { label: "Activa",    color: "text-green-400 bg-green-500/20"  },
  TRIAL:     { label: "Trial",     color: "text-blue-400 bg-blue-500/20"    },
  CANCELLED: { label: "Cancelada", color: "text-gray-400 bg-gray-500/20"    },
  PAST_DUE:  { label: "Vencida",   color: "text-red-400 bg-red-500/20"      },
}

const TABS = ["stats", "users", "codes", "subscriptions"] as const
type Tab = typeof TABS[number]

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── User row ─────────────────────────────────────────────────────────────────
function UserRow({ user, onRoleChange }: {
  user:         User
  onRoleChange: (userId: string, role: "USER" | "COACH" | "ADMIN") => void
}) {
  const [open, setOpen] = useState(false)
  const meta = ROLE_META[user.role as keyof typeof ROLE_META] ?? ROLE_META.USER

  return (
    <div className="rounded-xl bg-white/5 px-4 py-3 flex items-center gap-3 hover:bg-white/8 transition-colors">
      {/* Avatar */}
      <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-500/30 flex items-center justify-center text-sm font-black text-amber-400">
        {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase() ?? "?"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{user.name ?? "—"}</p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
      </div>

      {/* Meta */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        {user._count.clients > 0 && (
          <span className="text-[10px] text-gray-500">{user._count.clients} clientes</span>
        )}
        {user.subscription && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            STATUS_META[user.subscription.status as keyof typeof STATUS_META]?.color ?? ""
          }`}>
            {STATUS_META[user.subscription.status as keyof typeof STATUS_META]?.label}
          </span>
        )}
      </div>

      {/* Role badge + change */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all hover:opacity-80 ${meta.color}`}>
          {meta.label} ▾
        </button>
        {open && (
          <div className="absolute right-0 top-8 z-20 w-36 rounded-xl bg-[#1a1a2e] shadow-2xl ring-1 ring-white/10 overflow-hidden">
            {(["USER", "COACH", "ADMIN"] as const).map((role) => (
              <button key={role} onClick={() => { onRoleChange(user.id, role); setOpen(false) }}
                className={`w-full px-4 py-2.5 text-left text-xs font-semibold transition-colors hover:bg-white/10 ${
                  user.role === role ? "text-amber-400" : "text-gray-300"
                }`}>
                {user.role === role ? "✓ " : ""}{ROLE_META[role].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SuperAdminPanel() {
  const utils = api.useUtils()
  const [tab,    setTab]    = useState<Tab>("stats")
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"ALL" | "USER" | "COACH" | "ADMIN">("ALL")
  const [codeDays,   setCodeDays]   = useState(30)
  const [page, setPage] = useState(1)

  const { data: stats } = api.admin.getStats.useQuery(
    undefined,
    { staleTime: 0 }  // nunca cachear — datos de admin siempre frescos
  )
  const { data: usersData } = api.admin.getUsers.useQuery({
    search: search || undefined,
    role:   roleFilter === "ALL" ? undefined : roleFilter as UserRole,
    page,
    limit:  20,
  }, { keepPreviousData: true, staleTime: 0 } as any)
  const { data: codes = []         } = api.admin.getCodes.useQuery(
    undefined,
    { staleTime: 0 }  // nunca cachear
  )
  const { data: subscriptions = [] } = api.admin.getSubscriptions.useQuery(
    undefined,
    { staleTime: 0 }  // nunca cachear
  )

  const changeRole = api.admin.changeRole.useMutation({
    onSuccess: (_, vars) => {
      void utils.admin.getUsers.invalidate()
      void utils.admin.getStats.invalidate()
      toast.success(`Rol cambiado a ${vars.newRole}`)
    },
    onError: (e) => toast.error(e.message),
  })

  const generateCode = api.admin.generateCoachCode.useMutation({
    onSuccess: (data) => {
      void utils.admin.getCodes.invalidate()
      toast.success(`Código generado: ${data.code}`)
    },
    onError: (e) => toast.error(e.message),
  })

  const updateSub = api.admin.updateSubscription.useMutation({
    onSuccess: () => {
      void utils.admin.getSubscriptions.invalidate()
      toast.success("Suscripción actualizada")
    },
    onError: (e) => toast.error(e.message),
  })

  // Active codes
  const activeCodes = useMemo(() =>
    codes.filter((c) => !c.usedAt && new Date(c.expiresAt) > new Date()),
    [codes]
  )

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">🛡️ Panel de Administración</h1>
          <p className="text-xs text-gray-500">Gestión de usuarios, roles y suscripciones</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl bg-white/5 p-1 mb-6 gap-1 overflow-x-auto">
          {([
            { id: "stats",         label: "📊 Estadísticas" },
            { id: "users",         label: "👥 Usuarios"     },
            { id: "codes",         label: "🔑 Códigos"      },
            { id: "subscriptions", label: "💳 Suscripciones" },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                tab === t.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow"
                  : "text-gray-500 hover:text-gray-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── STATS ── */}
        {tab === "stats" && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard icon="👥" label="Usuarios totales"    value={stats.totalUsers}           color="#60a5fa" />
              <StatCard icon="🎓" label="Coaches"             value={stats.totalCoaches}         color="#fbbf24" />
              <StatCard icon="👤" label="Clientes vinculados" value={stats.totalClients}         color="#34d399" />
              <StatCard icon="📅" label="Planes creados"      value={stats.totalPlans}           color="#a78bfa" />
              <StatCard icon="🍳" label="Recetas"             value={stats.totalRecipes}         color="#f87171" />
              <StatCard icon="💳" label="Suscripciones activas" value={stats.activeSubscriptions} color="#fb923c" />
            </div>

            <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                Últimos registros
              </p>
              <div className="space-y-2">
                {stats.recentUsers.map((u) => {
                  const meta = ROLE_META[u.role as keyof typeof ROLE_META] ?? ROLE_META.USER
                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      <span className="text-sm text-white flex-1">{u.name ?? u.email}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        {new Date(u.createdAt).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div className="space-y-3">
            {/* Search + filter */}
            <div className="flex gap-2">
              <input type="text" placeholder="🔍 Buscar por nombre o email..."
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none" />
              <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as any); setPage(1) }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white focus:outline-none">
                <option value="ALL">Todos</option>
                <option value="USER">Usuario</option>
                <option value="COACH">Coach</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {/* User list */}
            <div className="space-y-1.5">
              {usersData?.users.map((user) => (
                <UserRow key={user.id} user={user}
                  onRoleChange={(id, role) => changeRole.mutate({ targetUserId: id, newRole: role })} />
              ))}
              {usersData?.users.length === 0 && (
                <p className="text-center text-gray-600 py-8 text-sm">Sin resultados</p>
              )}
            </div>

            {/* Pagination */}
            {usersData && usersData.pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-500">{usersData.total} usuarios · pág. {page}/{usersData.pages}</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10 disabled:opacity-30">
                    ← Anterior
                  </button>
                  <button disabled={page >= usersData.pages} onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10 disabled:opacity-30">
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CODES ── */}
        {tab === "codes" && (
          <div className="space-y-4">
            {/* Generator */}
            <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                Generar código de coach (early access)
              </p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">Validez</label>
                  <select value={codeDays} onChange={(e) => setCodeDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none">
                    {[7, 14, 30, 60, 90].map((d) => (
                      <option key={d} value={d}>{d} días</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => generateCode.mutate({ expiresInDays: codeDays })}
                  disabled={generateCode.isPending}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition-all">
                  {generateCode.isPending ? "..." : "+ Generar"}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-gray-600">
                {activeCodes.length} código{activeCodes.length !== 1 ? "s" : ""} activo{activeCodes.length !== 1 ? "s" : ""} ·
                límite early access: {process.env.NEXT_PUBLIC_COACH_LIMIT ?? "50"} coaches
              </p>
            </div>

            {/* Code list */}
            <div className="space-y-2">
              {codes.map((code) => {
                const used    = !!code.usedAt
                const expired = new Date(code.expiresAt) < new Date() && !used
                return (
                  <div key={code.id} className={`rounded-xl px-4 py-3 ring-1 ${
                    used    ? "bg-white/5 ring-white/5 opacity-50" :
                    expired ? "bg-red-500/5 ring-red-500/20" :
                              "bg-amber-500/10 ring-amber-500/20"
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-lg font-black tracking-widest text-amber-400">
                          {code.code.slice(0,4)}-{code.code.slice(4,8)}-{code.code.slice(8)}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {used    ? `Usado por ${code.usedBy?.name ?? code.usedBy?.email ?? "—"}` :
                           expired ? "Expirado" :
                                     `Expira ${new Date(code.expiresAt).toLocaleDateString("es-CO")}`}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        used    ? "bg-gray-500/20 text-gray-400" :
                        expired ? "bg-red-500/20 text-red-400" :
                                  "bg-amber-500/20 text-amber-400"
                      }`}>
                        {used ? "Usado" : expired ? "Expirado" : "Activo"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTIONS ── */}
        {tab === "subscriptions" && (
          <div className="space-y-2">
            {subscriptions.map((sub) => {
              const statusMeta = STATUS_META[sub.status as keyof typeof STATUS_META] ?? STATUS_META.TRIAL
              return (
                <div key={sub.id} className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {sub.user.name ?? sub.user.email}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {sub.clientCodeCredits} créditos cliente
                        </span>
                        {sub.currentPeriodEnd && (
                          <span className="text-[10px] text-gray-600">
                            hasta {new Date(sub.currentPeriodEnd).toLocaleDateString("es-CO")}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Quick status change */}
                    <select
                      value={sub.status}
                      onChange={(e) => updateSub.mutate({
                        subscriptionId: sub.id,
                        status: e.target.value as SubscriptionStatus,
                      })}
                      className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none">
                      <option value="TRIAL">Trial</option>
                      <option value="ACTIVE">Activa</option>
                      <option value="CANCELLED">Cancelada</option>
                      <option value="PAST_DUE">Vencida</option>
                    </select>
                  </div>
                </div>
              )
            })}
            {subscriptions.length === 0 && (
              <p className="text-center text-gray-600 py-8 text-sm">Sin suscripciones todavía</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
