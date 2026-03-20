"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import type { Sex, GoalType } from "../../../../generated/prisma"

// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS: { value: GoalType; label: string; emoji: string }[] = [
  { value: "FAT_LOSS",    label: "Perder grasa",  emoji: "🔥" },
  { value: "MUSCLE_GAIN", label: "Ganar músculo", emoji: "💪" },
  { value: "WEIGHT_LOSS", label: "Bajar de peso", emoji: "⚖️" },
  { value: "MAINTENANCE", label: "Mantenimiento", emoji: "🎯" },
]

const ACTIVITY_LEVELS = [
  { value: 1.2,   label: "Sedentario",  desc: "Poco ejercicio"            },
  { value: 1.375, label: "Ligero",      desc: "1–3 días/semana"           },
  { value: 1.55,  label: "Moderado",    desc: "3–5 días/semana"           },
  { value: 1.725, label: "Activo",      desc: "6–7 días/semana"           },
  { value: 1.9,   label: "Muy activo",  desc: "Entrenamiento intenso"     },
]

const TABS = [
  { id: "profile",  label: "Perfil",   emoji: "👤" },
  { id: "coach",    label: "Coach",    emoji: "🎓" },
  { id: "account",  label: "Cuenta",   emoji: "⚙️" },
] as const

type TabId = typeof TABS[number]["id"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">{children}</h3>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors" />
  )
}

// ─── Code display card ────────────────────────────────────────────────────────

function InviteCodeCard({ code, expiresAt, onRevoke }: {
  code:      string
  expiresAt: Date
  onRevoke?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const expires  = new Date(expiresAt)
  const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000))

  const copy = () => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-2xl font-black tracking-widest text-amber-400 letter-spacing-4">
            {code.slice(0, 4)}-{code.slice(4)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Expira en {daysLeft} día{daysLeft !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={copy}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              copied ? "bg-green-500 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
            }`}>
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const [tab,  setTab]  = useState<TabId>("profile")
  const [code, setCode] = useState("")

  const utils = api.useUtils()

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: summary } = api.userProfile.getSummary.useQuery()
  const { data: session } = api.userProfile.get.useQuery()
  const { data: codes   } = api.coach.getActiveCodes.useQuery(undefined, {
    enabled: summary?.user?.role === "COACH" || summary?.user?.role === "ADMIN",
  })

  // ── Profile form state ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    age:            summary?.age         ?? 25,
    heightCm:       summary?.heightCm    ?? 170,
    weightKg:       summary?.weightKg    ?? 70,
    bodyFatPct:     summary?.bodyFatPct  ?? "",
    sex:            summary?.sex         ?? ("MALE" as Sex),
    goal:           summary?.goal        ?? ("MAINTENANCE" as GoalType),
    activityFactor: summary?.activityFactor ?? 1.375,
  })

  const set = (k: keyof typeof form, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }))

  // ── Mutations ────────────────────────────────────────────────────────────────

  const updateProfile = api.userProfile.update.useMutation({
    onSuccess: () => {
      void utils.userProfile.getSummary.invalidate()
      toast.success("Perfil actualizado ✓")
    },
    onError: (e) => toast.error(e.message),
  })

  const generateCode = api.coach.generateInviteCode.useMutation({
    onSuccess: () => {
      void utils.coach.getActiveCodes.invalidate()
      toast.success("Código generado")
    },
    onError: (e) => toast.error(e.message),
  })

  const redeemCode = api.coach.redeemCode.useMutation({
    onSuccess: (data) => {
      void utils.userProfile.getSummary.invalidate()
      setCode("")
      toast.success(`Vinculado con ${data.coachName} ✓`)
    },
    onError: (e) => toast.error(e.message),
  })

  const unlinkCoach = api.coach.unlinkCoach.useMutation({
    onSuccess: () => {
      void utils.userProfile.getSummary.invalidate()
      toast.success("Coach desvinculado")
    },
    onError: (e) => toast.error(e.message),
  })

  const isCoach = summary?.user?.role === "COACH" || summary?.user?.role === "ADMIN"

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white p-4 md:p-6">
      <div className="mx-auto max-w-2xl">

        {/* ── Header ── */}
        <div className="mb-6 flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl font-black text-white shadow-lg">
              {summary?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0c0c10] ${isCoach ? "bg-amber-400" : "bg-green-400"}`} />
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

        {/* ════════════════════════════════════════════════════════════════════
            TAB: PERFIL
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "profile" && (
          <div className="space-y-6">

            {/* Datos físicos */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-4">
              <SectionTitle>📐 Datos físicos</SectionTitle>

              {/* Sexo */}
              <Field label="Sexo biológico">
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(["MALE", "FEMALE"] as Sex[]).map((s) => (
                    <button key={s} onClick={() => set("sex", s)}
                      className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                        form.sex === s
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
                  <Input type="number" value={form.age} min={10} max={100}
                    onChange={(e) => set("age", Number(e.target.value))} />
                </Field>
                <Field label="Altura (cm)">
                  <Input type="number" value={form.heightCm} min={100} max={250}
                    onChange={(e) => set("heightCm", Number(e.target.value))} />
                </Field>
                <Field label="Peso (kg)">
                  <Input type="number" value={form.weightKg} min={20} max={400} step={0.1}
                    onChange={(e) => set("weightKg", Number(e.target.value))} />
                </Field>
              </div>

              <Field label="% Grasa corporal (opcional)">
                <Input type="number" value={form.bodyFatPct} min={3} max={70} placeholder="—"
                  onChange={(e) => set("bodyFatPct", e.target.value === "" ? "" : Number(e.target.value))} />
              </Field>
            </div>

            {/* Objetivo */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-3">
              <SectionTitle>🎯 Objetivo</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <button key={g.value} onClick={() => set("goal", g.value)}
                    className={`rounded-xl py-3 text-sm font-bold transition-all text-center ${
                      form.goal === g.value
                        ? "bg-amber-500 text-white shadow"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}>
                    <span className="text-xl block mb-0.5">{g.emoji}</span>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nivel de actividad */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-2">
              <SectionTitle>🏃 Nivel de actividad</SectionTitle>
              {ACTIVITY_LEVELS.map((a) => (
                <button key={a.value} onClick={() => set("activityFactor", a.value)}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                    form.activityFactor === a.value
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

            {/* Factor metabólico — solo lectura */}
            <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">🧬 Factor de adaptación metabólica</p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  Se ajusta automáticamente al registrar peso real
                </p>
              </div>
              <span className="font-mono text-lg font-black text-amber-400">
                {(summary?.metabolicAdjustment ?? 1).toFixed(4)}
              </span>
            </div>

            <button
              onClick={() => updateProfile.mutate({
                age:            form.age,
                heightCm:       form.heightCm,
                weightKg:       form.weightKg,
                bodyFatPct:     form.bodyFatPct === "" ? undefined : Number(form.bodyFatPct),
                sex:            form.sex,
                goal:           form.goal,
                activityFactor: form.activityFactor,
              })}
              disabled={updateProfile.isPending}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-sm font-bold text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all active:scale-[0.98]">
              {updateProfile.isPending ? "Guardando..." : "💾 Guardar cambios"}
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB: COACH
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "coach" && (
          <div className="space-y-5">

            {/* ── Panel COACH: generar códigos ── */}
            {isCoach && (
              <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-4">
                <SectionTitle>🎓 Panel de coach — códigos de invitación</SectionTitle>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Genera un código y compártelo con tu cliente. Válido por 7 días, un uso.
                </p>

                <button
                  onClick={() => generateCode.mutate()}
                  disabled={generateCode.isPending}
                  className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition-all">
                  {generateCode.isPending ? "Generando..." : "+ Generar nuevo código"}
                </button>

                {/* Códigos activos */}
                {codes && codes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">{codes.length} código{codes.length !== 1 ? "s" : ""} activo{codes.length !== 1 ? "s" : ""}</p>
                    {codes.map((c) => (
                      <InviteCodeCard key={c.id} code={c.code} expiresAt={c.expiresAt} />
                    ))}
                  </div>
                )}

                {codes?.length === 0 && (
                  <p className="text-center text-xs text-gray-600 py-2">Sin códigos activos</p>
                )}
              </div>
            )}

            {/* ── Panel USUARIO: mi coach ── */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-4">
              <SectionTitle>🔗 Mi coach</SectionTitle>

              {summary?.coach ? (
                <div>
                  {/* Coach card */}
                  <div className="flex items-center gap-3 rounded-2xl bg-green-500/10 border border-green-500/30 p-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xl font-black text-white">
                      {summary.coach.name?.[0]?.toUpperCase() ?? "C"}
                    </div>
                    <div>
                      <p className="font-bold text-white">{summary.coach.name}</p>
                      <p className="text-xs text-gray-400">{summary.coach.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
                        ✓ Vinculado
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => unlinkCoach.mutate()}
                    disabled={unlinkCoach.isPending}
                    className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all">
                    {unlinkCoach.isPending ? "Desvinculando..." : "Desvincular coach"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                    <p className="text-3xl mb-2">👤</p>
                    <p className="text-sm text-gray-400">Sin coach asignado</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Ingresa el código que te dio tu coach para vincularte
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      placeholder="XXXX-XXXX"
                      maxLength={9}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-lg font-bold text-amber-400 tracking-widest placeholder-gray-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      onClick={() => redeemCode.mutate({ code: code.replace("-", "") })}
                      disabled={code.replace("-", "").length < 6 || redeemCode.isPending}
                      className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-40 transition-all">
                      {redeemCode.isPending ? "..." : "Vincular"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Coach info para usuarios con rol USER que quieran ser coach */}
            {!isCoach && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs font-bold text-amber-400 mb-1">¿Eres coach o entrenador?</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Contacta al administrador para que actualice tu rol a Coach
                  y puedas gestionar clientes y generar códigos de invitación.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB: CUENTA
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "account" && (
          <div className="space-y-4">

            {/* Info de cuenta — solo lectura por ahora */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-4">
              <SectionTitle>📧 Información de cuenta</SectionTitle>
              <Field label="Nombre">
                <Input type="text" value={summary?.user?.name ?? ""} readOnly
                  className="opacity-50 cursor-not-allowed" />
              </Field>
              <Field label="Email">
                <Input type="email" value={summary?.user?.email ?? ""} readOnly
                  className="opacity-50 cursor-not-allowed" />
              </Field>
              <p className="text-xs text-gray-600">
                Para cambiar email o contraseña usa la opción de proveedor de autenticación.
              </p>
            </div>

            {/* Stats de uso */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 space-y-3">
              <SectionTitle>📊 Resumen de tu cuenta</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Peso estimado", value: `${(summary?.estimatedCurrentWeight ?? 0).toFixed(1)} kg`, icon: "⚖️" },
                  { label: "Último peso registrado", value: `${(summary?.latestLoggedWeight ?? 0).toFixed(1)} kg`, icon: "📅" },
                  { label: "Factor metabólico", value: (summary?.metabolicAdjustment ?? 1).toFixed(4), icon: "🧬" },
                  { label: "Rol", value: summary?.user?.role ?? "USER", icon: "👤" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/5 p-3">
                    <p className="text-xs text-gray-500 mb-1">{s.icon} {s.label}</p>
                    <p className="text-sm font-black text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
              <SectionTitle>⚠️ Zona de peligro</SectionTitle>
              <button
                onClick={() => {
                  toast.error("Función no disponible aún. Contacta al soporte.")
                }}
                className="w-full rounded-2xl border border-red-500/30 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all">
                Eliminar mi cuenta
              </button>
              <p className="text-[10px] text-gray-600 text-center">
                Esta acción es irreversible y eliminará todos tus datos.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
