/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
"use client"

import { useState, useEffect } from "react"
import { toast }    from "sonner"
import { useRouter } from "next/navigation"
import { signOut }  from "next-auth/react"
import { api }      from "@/trpc/react"
import type { Sex, GoalType } from "@prisma/client"

// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS: { value: GoalType; label: string; emoji: string }[] = [
  { value: "FAT_LOSS",    label: "Perder grasa",  emoji: "🔥" },
  { value: "MUSCLE_GAIN", label: "Ganar músculo", emoji: "💪" },
  { value: "WEIGHT_LOSS", label: "Bajar de peso", emoji: "⚖️" },
  { value: "MAINTENANCE", label: "Mantenimiento", emoji: "🎯" },
]

const ACTIVITY_LEVELS = [
  { value: 1.2,   label: "Sedentario",  desc: "Poco ejercicio"        },
  { value: 1.375, label: "Ligero",      desc: "1–3 días/semana"       },
  { value: 1.55,  label: "Moderado",    desc: "3–5 días/semana"       },
  { value: 1.725, label: "Activo",      desc: "6–7 días/semana"       },
  { value: 1.9,   label: "Muy activo",  desc: "Entrenamiento intenso" },
]

const TABS = [
  { id: "profile", label: "Perfil",  emoji: "👤" },
  { id: "coach",   label: "Coach",   emoji: "🎓" },
  { id: "account", label: "Cuenta",  emoji: "⚙️" },
] as const

type TabId = typeof TABS[number]["id"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">{children}</h3>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-gray-400">{label}</label>
        {hint && <span className="text-[10px] text-gray-600">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white
        placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-2
        focus:ring-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`} />
  )
}

// ─── Client code card ─────────────────────────────────────────────────────────

function ClientCodeCard({ code, expiresAt }: { code: string; expiresAt: Date }) {
  const [copied, setCopied] = useState(false)
  const days = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Format: XXXX-XXXX
  const formatted = code.length === 8
    ? `${code.slice(0,4)}-${code.slice(4)}`
    : code

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xl font-black tracking-widest text-amber-400">
            {formatted}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            👤 Código cliente · expira en {days} día{days !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={copy}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
            copied ? "bg-green-500 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
          }`}>
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  message, onConfirm, onCancel, loading,
}: {
  message: string; onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-[#1a1a2e] p-6 shadow-2xl ring-1 ring-white/10">
        <p className="text-sm text-gray-300 mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:bg-white/5">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
            {loading ? "..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const utils  = api.useUtils()

  const [tab,         setTab]         = useState<TabId>("profile")
  const [coachCode,   setCoachCode]   = useState("")
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Data ────────────────────────────────────────────────────────────────────

  const { data: summary, isLoading } = api.userProfile.getSummary.useQuery(
    undefined,
    { staleTime: 10 * 60_000 }  // 10 minutos — lento
  )

  const isCoach = summary?.user?.role === "COACH" || summary?.user?.role === "ADMIN"

  const { data: clientCodes = [] } = api.coach.getActiveCodes.useQuery(undefined, {
    enabled:   isCoach,
    staleTime: 10 * 60_000,     // 10 minutos — lento
  })

  // ── Physical profile form ───────────────────────────────────────────────────

  const [physForm, setPhysForm] = useState({
    age:            25,
    heightCm:       170,
    weightKg:       70,
    bodyFatPct:     "" as number | "",
    sex:            "MALE"        as Sex,
    goal:           "MAINTENANCE" as GoalType,
    activityFactor: 1.375,
  })

  // Sync form when data arrives
  useEffect(() => {
    if (!summary) return
    setPhysForm({
      age:            summary.age,
      heightCm:       summary.heightCm,
      weightKg:       summary.weightKg,
      bodyFatPct:     summary.bodyFatPct ?? "",
      sex:            summary.sex ,
      goal:           summary.goal,
      activityFactor: summary.activityFactor,
    })
  }, [summary])

  // ── Account form (name + email) ─────────────────────────────────────────────

  const [accountForm, setAccountForm] = useState({ name: "", email: "" })
  const [editingAccount, setEditingAccount] = useState(false)

  useEffect(() => {
    if (!summary?.user) return
    setAccountForm({
      name:  summary.user.name  ?? "",
      email: summary.user.email ?? "",
    })
  }, [summary?.user])

  // ── Mutations ───────────────────────────────────────────────────────────────

  const updateProfile = api.userProfile.update.useMutation({
    onSuccess: () => {
      void utils.userProfile.getSummary.invalidate()
      toast.success("Perfil actualizado ✓")
    },
    onError: (e) => toast.error(e.message),
  })

  const updateAccount = api.auth.updateAccount.useMutation({
    onSuccess: () => {
      void utils.userProfile.getSummary.invalidate()
      setEditingAccount(false)
      toast.success("Cuenta actualizada ✓")
    },
    onError: (e) => toast.error(e.message),
  })

  const generateClientCode = api.coach.generateInviteCode.useMutation({
    onSuccess: () => {
      void utils.coach.getActiveCodes.invalidate()
      toast.success("Código de cliente generado ✓")
    },
    onError: (e) => toast.error(e.message),
  })

  const redeemCode = api.coach.redeemCode.useMutation({
    onSuccess: (data) => {
      void utils.userProfile.getSummary.invalidate()
      setCoachCode("")
      toast.success(`Vinculado con ${data.coachName} ✓`)
    },
    onError: (e) => toast.error(e.message),
  })

  const unlinkCoach = api.coach.unlinkCoach.useMutation({
    onSuccess: () => {
      void utils.userProfile.getSummary.invalidate()
      setConfirmUnlink(false)
      toast.success("Coach desvinculado")
    },
    onError: (e) => toast.error(e.message),
  })

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center">
        <div className="text-amber-400 animate-pulse text-sm">Cargando perfil...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white p-4 md:p-6">
      <div className="mx-auto max-w-2xl">

        {/* ── Header ── */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500
              flex items-center justify-center text-2xl font-black text-white shadow-lg">
              {summary?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0c0c10] ${
              isCoach ? "bg-amber-400" : "bg-green-400"
            }`} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{summary?.user?.name ?? "Mi perfil"}</h1>
            <p className="text-sm text-gray-500">{summary?.user?.email}</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              isCoach ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
            }`}>
              {isCoach ? "🎓 Coach" : "👤 Usuario"}
            </span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex rounded-2xl bg-white/5 p-1 mb-6 gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                tab === t.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow"
                  : "text-gray-500 hover:text-gray-300"
              }`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* ════════════ TAB: PERFIL ════════════ */}
        {tab === "profile" && (
          <div className="space-y-5">

            {/* Datos físicos */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-4">
              <SectionTitle>📐 Datos físicos</SectionTitle>

              <Field label="Sexo biológico">
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(["MALE", "FEMALE"] as Sex[]).map((s) => (
                    <button key={s} onClick={() => setPhysForm((p) => ({ ...p, sex: s }))}
                      className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                        physForm.sex === s
                          ? "bg-amber-500 text-white"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}>
                      {s === "MALE" ? "♂ Masculino" : "♀ Femenino"}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Edad">
                  <Input type="number" value={physForm.age} min={10} max={100}
                    onChange={(e) => setPhysForm((p) => ({ ...p, age: Number(e.target.value) }))} />
                </Field>
                <Field label="Altura (cm)">
                  <Input type="number" value={physForm.heightCm} min={100} max={250}
                    onChange={(e) => setPhysForm((p) => ({ ...p, heightCm: Number(e.target.value) }))} />
                </Field>
                <Field label="Peso (kg)">
                  <Input type="number" value={physForm.weightKg} min={20} max={400} step={0.1}
                    onChange={(e) => setPhysForm((p) => ({ ...p, weightKg: Number(e.target.value) }))} />
                </Field>
              </div>

              <Field label="% Grasa corporal" hint="opcional">
                <Input type="number" value={physForm.bodyFatPct} min={3} max={70} placeholder="—"
                  onChange={(e) => setPhysForm((p) => ({
                    ...p,
                    bodyFatPct: e.target.value === "" ? "" : Number(e.target.value),
                  }))} />
              </Field>
            </div>

            {/* Objetivo */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-3">
              <SectionTitle>🎯 Objetivo</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <button key={g.value} onClick={() => setPhysForm((p) => ({ ...p, goal: g.value }))}
                    className={`rounded-xl py-3 text-sm font-bold transition-all text-center ${
                      physForm.goal === g.value
                        ? "bg-amber-500 text-white shadow"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}>
                    <span className="text-xl block mb-0.5">{g.emoji}</span>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actividad */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-2">
              <SectionTitle>🏃 Nivel de actividad</SectionTitle>
              {ACTIVITY_LEVELS.map((a) => (
                <button key={a.value}
                  onClick={() => setPhysForm((p) => ({ ...p, activityFactor: a.value }))}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                    physForm.activityFactor === a.value
                      ? "bg-amber-500/20 ring-1 ring-amber-500/50"
                      : "bg-white/5 hover:bg-white/10"
                  }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white">{a.label}</p>
                      <p className="text-xs text-gray-500">{a.desc}</p>
                    </div>
                    <span className="font-mono text-xs text-amber-400 font-bold">×{a.value}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Factor metabólico */}
            <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">🧬 Factor de adaptación metabólica</p>
                <p className="text-[10px] text-gray-600 mt-0.5">Se ajusta al registrar peso real</p>
              </div>
              <span className="font-mono text-lg font-black text-amber-400">
                {(summary?.metabolicAdjustment ?? 1).toFixed(4)}
              </span>
            </div>

            <button
              onClick={() => updateProfile.mutate({
                age:            physForm.age,
                heightCm:       physForm.heightCm,
                weightKg:       physForm.weightKg,
                bodyFatPct:     physForm.bodyFatPct === "" ? undefined : Number(physForm.bodyFatPct),
                sex:            physForm.sex,
                goal:           physForm.goal,
                activityFactor: physForm.activityFactor,
              })}
              disabled={updateProfile.isPending}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-sm font-bold text-white
                shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all active:scale-[0.98]">
              {updateProfile.isPending ? "Guardando..." : "💾 Guardar cambios"}
            </button>
          </div>
        )}

        {/* ════════════ TAB: COACH ════════════ */}
        {tab === "coach" && (
          <div className="space-y-5">

            {/* ── Panel COACH ── */}
            {isCoach && (
              <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <SectionTitle>🎓 Códigos de cliente</SectionTitle>
                  <span className="text-[10px] text-gray-600">
                    {clientCodes.length} activo{clientCodes.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Genera un código y compártelo con tu cliente. Válido por 7 días, un solo uso.
                  El cliente lo ingresa al registrarse para vincularse automáticamente contigo.
                </p>

                <button
                  onClick={() => generateClientCode.mutate()}
                  disabled={generateClientCode.isPending}
                  className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white
                    hover:bg-amber-600 disabled:opacity-50 transition-all active:scale-[0.98]">
                  {generateClientCode.isPending ? "Generando..." : "➕ Generar código de cliente"}
                </button>

                {/* Active codes list */}
                {clientCodes.length > 0 ? (
                  <div className="space-y-2">
                    {clientCodes.map((c) => (
                      <ClientCodeCard key={c.id} code={c.code} expiresAt={c.expiresAt} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-white/5 py-6 text-center">
                    <p className="text-xs text-gray-600">Sin códigos activos todavía</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Mi coach ── */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-4">
              <SectionTitle>🔗 Mi coach</SectionTitle>

              {summary?.user?.coach ? (
                <>
                  <div className="flex items-center gap-3 rounded-2xl bg-green-500/10 border border-green-500/30 p-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600
                      flex items-center justify-center text-xl font-black text-white flex-shrink-0">
                      {summary.user.coach.name?.[0]?.toUpperCase() ?? "C"}
                    </div>
                    <div>
                      <p className="font-bold text-white">{summary.user.coach.name}</p>
                      <p className="text-xs text-gray-400">{summary.user.coach.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
                        ✓ Vinculado
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmUnlink(true)}
                    className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-bold
                      text-red-400 hover:bg-red-500/20 transition-all">
                    Desvincular coach
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                    <p className="text-2xl mb-1">👤</p>
                    <p className="text-sm text-gray-400">Sin coach asignado</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Ingresa el código de 8 caracteres que te dio tu coach
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={coachCode}
                      onChange={(e) => setCoachCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                      placeholder="XXXXXXXX"
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3
                        text-center font-mono text-lg font-bold text-amber-400 tracking-[0.25em]
                        placeholder-gray-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      onClick={() => redeemCode.mutate({ code: coachCode })}
                      disabled={coachCode.length < 6 || redeemCode.isPending}
                      className="rounded-xl bg-amber-500 px-5 text-sm font-bold text-white
                        hover:bg-amber-600 disabled:opacity-40 transition-all">
                      {redeemCode.isPending ? "..." : "Vincular"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Info para usuarios sin rol coach */}
            {!isCoach && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs font-bold text-amber-400 mb-1">¿Eres coach o entrenador?</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Solicita un código de coach al administrador o regístrate con un código de early access.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════ TAB: CUENTA ════════════ */}
        {tab === "account" && (
          <div className="space-y-4">

            {/* Nombre y email */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle>📧 Información de cuenta</SectionTitle>
                <button
                  onClick={() => setEditingAccount((v) => !v)}
                  className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/20 transition-colors">
                  {editingAccount ? "Cancelar" : "✏️ Editar"}
                </button>
              </div>

              <Field label="Nombre">
                <Input
                  type="text"
                  value={accountForm.name}
                  disabled={!editingAccount}
                  onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Tu nombre completo"
                />
              </Field>

              <Field label="Email">
                <Input
                  type="email"
                  value={accountForm.email}
                  disabled={!editingAccount}
                  onChange={(e) => setAccountForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="tu@email.com"
                />
              </Field>

              {editingAccount && (
                <>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
                    ⚠️ Si cambias el email tendrás que usar el nuevo para iniciar sesión.
                  </div>
                  <button
                    onClick={() => updateAccount.mutate({
                      name:  accountForm.name  || undefined,
                      email: accountForm.email || undefined,
                    })}
                    disabled={updateAccount.isPending}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white
                      hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all">
                    {updateAccount.isPending ? "Guardando..." : "Guardar cambios de cuenta"}
                  </button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-3">
              <SectionTitle>📊 Resumen</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Peso estimado",  value: `${(summary?.estimatedCurrentWeight ?? 0).toFixed(1)} kg`, icon: "⚖️" },
                  { label: "Último pesaje",  value: `${(summary?.latestLoggedWeight ?? 0).toFixed(1)} kg`,     icon: "📅" },
                  { label: "Factor met.",    value: (summary?.metabolicAdjustment ?? 1).toFixed(4),            icon: "🧬" },
                  { label: "Rol",            value: summary?.user?.role ?? "USER",                              icon: "👤" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/5 p-3">
                    <p className="text-xs text-gray-500 mb-1">{s.icon} {s.label}</p>
                    <p className="text-sm font-black text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="w-full rounded-2xl border border-white/10 py-3 text-sm font-bold text-gray-400
                hover:bg-white/5 hover:text-white transition-all">
              🚪 Cerrar sesión
            </button>

            {/* Danger zone */}
            <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
              <SectionTitle>⚠️ Zona de peligro</SectionTitle>
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full rounded-2xl border border-red-500/30 py-3 text-sm font-bold text-red-400
                  hover:bg-red-500/10 transition-all">
                Eliminar mi cuenta
              </button>
              <p className="text-[10px] text-gray-600 text-center">
                Irreversible — se eliminarán todos tus datos.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Unlink coach confirm */}
      {confirmUnlink && (
        <ConfirmDialog
          message="¿Seguro que quieres desvincular a tu coach? Perderás acceso a su seguimiento."
          onConfirm={() => unlinkCoach.mutate()}
          onCancel={() => setConfirmUnlink(false)}
          loading={unlinkCoach.isPending}
        />
      )}

      {/* Delete account confirm */}
      {confirmDelete && (
        <ConfirmDialog
          message="¿Eliminar tu cuenta? Esta acción no se puede deshacer y perderás todos tus datos."
          onConfirm={() => toast.error("Función no disponible aún. Contacta al soporte.")}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
