"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/trpc/react"
import type { Sex, GoalType } from "../../../../generated/prisma"
// import { useSession } from "next-auth/react"


// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS: { value: GoalType; label: string; desc: string; emoji: string; color: string }[] = [
  { value: "FAT_LOSS",     label: "Perder grasa",    desc: "Déficit calórico controlado",    emoji: "🔥", color: "from-orange-400 to-red-500"    },
  { value: "MUSCLE_GAIN",  label: "Ganar músculo",   desc: "Superávit con alto en proteína", emoji: "💪", color: "from-blue-400 to-blue-600"      },
  { value: "WEIGHT_LOSS",  label: "Bajar de peso",   desc: "Reducción de peso general",      emoji: "⚖️", color: "from-purple-400 to-purple-600"  },
  { value: "MAINTENANCE",  label: "Mantenimiento",   desc: "Equilibrio energético diario",   emoji: "🎯", color: "from-green-400 to-emerald-600"  },
]

const ACTIVITY_LEVELS: { value: number; label: string; desc: string }[] = [
  { value: 1.2,  label: "Sedentario",       desc: "Poco o ningún ejercicio"          },
  { value: 1.375,label: "Ligero",            desc: "Ejercicio 1–3 días/semana"        },
  { value: 1.55, label: "Moderado",          desc: "Ejercicio 3–5 días/semana"        },
  { value: 1.725,label: "Activo",            desc: "Ejercicio 6–7 días/semana"        },
  { value: 1.9,  label: "Muy activo",        desc: "Entrenamiento intenso + trabajo físico" },
]

const STEPS = ["Datos básicos", "Composición", "Objetivo", "Actividad"]

// ─── Step indicators ──────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`transition-all duration-300 rounded-full ${
          i < current  ? "h-2 w-2 bg-amber-500" :
          i === current ? "h-2 w-6 bg-amber-500" :
                          "h-2 w-2 bg-gray-200"
        }`} />
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)


// if (status === "loading") {
//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
//       <div className="text-amber-600 animate-pulse">Cargando...</div>
//     </div>
//   )
// }

// if (status === "unauthenticated") {
//   router.push("/auth/signin")
//   return null
// }

  const [form, setForm] = useState({
    sex:           "MALE"        as Sex,
    age:           25,
    heightCm:      170,
    weightKg:      70,
    bodyFatPct:    "" as number | "",
    goal:          "MAINTENANCE" as GoalType,
    activityFactor: 1.375,
  })

  const set = (key: keyof typeof form, value: unknown) =>
    setForm((p) => ({ ...p, [key]: value }))

  const createProfile = api.userProfile.create.useMutation({
    onSuccess: () => {
      toast.success("¡Perfil creado! Bienvenido 🎉")
      router.push("/dashboard")
    },
    onError: (e) => toast.error(e.message),
  })

  const handleSubmit = () => {
    createProfile.mutate({
      sex:           form.sex,
      age:           form.age,
      heightCm:      form.heightCm,
      weightKg:      form.weightKg,
      bodyFatPct:    form.bodyFatPct === "" ? undefined : form.bodyFatPct,
      goal:          form.goal,
      activityFactor: form.activityFactor,
    })
  }

  // ─── BMR preview ────────────────────────────────────────────────────────────
  const bmrPreview = Math.round(
    (10 * form.weightKg + 6.25 * form.heightCm - 5 * form.age +
    (form.sex === "MALE" ? 5 : -161)) * form.activityFactor
  )

  // ─── Steps ──────────────────────────────────────────────────────────────────

  const steps = [

    // STEP 0 — Datos básicos
    <div key="basic" className="space-y-5">
      <div>
        <label className="label">Sexo biológico</label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {(["MALE", "FEMALE"] as Sex[]).map((s) => (
            <button key={s} type="button"
              onClick={() => set("sex", s)}
              className={`rounded-2xl border-2 py-4 text-center font-bold transition-all ${
                form.sex === s
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-gray-200 bg-white text-gray-500 hover:border-amber-300"
              }`}>
              <div className="text-3xl mb-1">{s === "MALE" ? "♂️" : "♀️"}</div>
              {s === "MALE" ? "Masculino" : "Femenino"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Edad</label>
        <div className="flex items-center gap-3 mt-1">
          <input type="range" min={10} max={90} value={form.age}
            onChange={(e) => set("age", Number(e.target.value))}
            className="flex-1 accent-amber-500" />
          <span className="w-16 rounded-xl bg-amber-50 py-2 text-center text-xl font-black text-amber-700">
            {form.age}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Altura (cm)</label>
          <input type="number" min={100} max={250} value={form.heightCm}
            onChange={(e) => set("heightCm", Number(e.target.value))}
            className="input mt-1" />
        </div>
        <div>
          <label className="label">Peso (kg)</label>
          <input type="number" min={20} max={400} step={0.1} value={form.weightKg}
            onChange={(e) => set("weightKg", Number(e.target.value))}
            className="input mt-1" />
        </div>
      </div>
    </div>,

    // STEP 1 — Composición corporal
    <div key="body" className="space-y-5">
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">¿Por qué el % de grasa?</p>
        <p className="text-amber-700 leading-relaxed">
          Si lo conoces, el motor puede calcular tu masa muscular y
          ajustar el BMR con mayor precisión. Si no lo sabes, puedes dejarlo
          en blanco — usaremos la ecuación de Mifflin-St Jeor estándar.
        </p>
      </div>

      <div>
        <label className="label">% Grasa corporal <span className="text-gray-400">(opcional)</span></label>
        <div className="flex items-center gap-3 mt-1">
          <input type="range" min={3} max={60}
            value={form.bodyFatPct === "" ? 20 : form.bodyFatPct}
            onChange={(e) => set("bodyFatPct", Number(e.target.value))}
            className="flex-1 accent-amber-500" />
          <div className="flex items-center gap-2">
            <span className="w-16 rounded-xl bg-amber-50 py-2 text-center text-xl font-black text-amber-700">
              {form.bodyFatPct === "" ? "—" : `${form.bodyFatPct}%`}
            </span>
            <button type="button"
              onClick={() => set("bodyFatPct", "")}
              className="text-xs text-gray-400 hover:text-red-400">✕</button>
          </div>
        </div>
      </div>

      {/* BMR preview */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-lg">
        <p className="text-sm font-medium opacity-80 mb-1">Gasto energético estimado</p>
        <p className="text-4xl font-black">{bmrPreview.toLocaleString()} <span className="text-xl font-normal opacity-80">kcal/día</span></p>
        <p className="text-xs opacity-60 mt-1">Basado en tus datos actuales · ajustable con datos reales</p>
      </div>
    </div>,

    // STEP 2 — Objetivo
    <div key="goal" className="space-y-3">
      {GOALS.map((g) => (
        <button key={g.value} type="button"
          onClick={() => set("goal", g.value)}
          className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
            form.goal === g.value
              ? "border-amber-500 bg-amber-50"
              : "border-gray-100 bg-white hover:border-amber-200"
          }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${g.color} text-2xl shadow`}>
              {g.emoji}
            </div>
            <div>
              <p className="font-bold text-gray-900">{g.label}</p>
              <p className="text-sm text-gray-500">{g.desc}</p>
            </div>
            {form.goal === g.value && (
              <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">✓</div>
            )}
          </div>
        </button>
      ))}
    </div>,

    // STEP 3 — Actividad
    <div key="activity" className="space-y-3">
      {ACTIVITY_LEVELS.map((a) => (
        <button key={a.value} type="button"
          onClick={() => set("activityFactor", a.value)}
          className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
            form.activityFactor === a.value
              ? "border-amber-500 bg-amber-50"
              : "border-gray-100 bg-white hover:border-amber-200"
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{a.label}</p>
              <p className="text-sm text-gray-500">{a.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600">
                ×{a.value}
              </span>
              {form.activityFactor === a.value && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">✓</div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>,
  ]

  const isLastStep = step === STEPS.length - 1

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="w-full max-w-md">

        {/* Logo / título */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-3xl shadow-lg">
            ⚡
          </div>
          <h1 className="text-2xl font-black text-gray-900">Configura tu perfil</h1>
          <p className="mt-1 text-sm text-gray-500">
            Paso {step + 1} de {STEPS.length} — <span className="font-medium text-amber-600">{STEPS[step]}</span>
          </p>
        </div>

        <StepDots current={step} total={STEPS.length} />

        {/* Card */}
        <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
          {steps[step]}

          {/* Navigation */}
          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)}
                className="flex-1 rounded-2xl border-2 border-gray-200 py-3.5 text-sm font-bold text-gray-600 hover:border-gray-300 transition-colors">
                ← Atrás
              </button>
            )}
            <button
              type="button"
              onClick={() => isLastStep ? handleSubmit() : setStep((s) => s + 1)}
              disabled={createProfile.isPending}
              className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {createProfile.isPending ? "Creando perfil..." :
               isLastStep ? "¡Comenzar! 🚀" : "Continuar →"}
            </button>
          </div>
        </div>

        {/* Step labels */}
        <div className="mt-4 flex justify-between px-1">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-xs transition-colors ${
              i === step ? "font-bold text-amber-600" :
              i < step   ? "text-gray-400" : "text-gray-300"
            }`}>{s}</span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .label { @apply text-sm font-semibold text-gray-700; }
        .input { @apply w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-colors; }
      `}</style>
    </div>
  )
}
