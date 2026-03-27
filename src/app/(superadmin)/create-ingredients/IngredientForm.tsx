/* eslint-disable @typescript-eslint/no-base-to-string */
"use client"

// src/components/domain/IngredientForm.tsx
// Formulario compartido para crear ingredientes.
// El prop `mode` determina si crea un ingrediente personal (USER)
// o global (ADMIN). El router decide qué procedure llamar.

import { useState }   from "react"
import { useRouter }  from "next/navigation"
import { toast }      from "sonner"
import { api }        from "@/trpc/react"

type Mode = "personal" | "global"

interface IngredientFormProps {
  mode:        Mode
  redirectTo?: string   // ruta a la que ir después de crear (default: /ingredients)
}

// ── helpers ───────────────────────────────────────────────────────────────────

function Field({
  id, label, type = "number", placeholder, required, step, maxLength,
}: {
  id: string; label: string; type?: string; placeholder?: string
  required?: boolean; step?: string; maxLength?: number
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-400 mb-1.5">
        {label} {required && <span className="text-amber-400">*</span>}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        required={required}
        step={step}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5
          text-sm text-white placeholder-gray-600
          focus:border-amber-500 focus:outline-none focus:bg-white/8
          transition-colors"
      />
    </div>
  )
}

// ── Form ──────────────────────────────────────────────────────────────────────

export function IngredientForm({ mode, redirectTo }: IngredientFormProps) {
  const router  = useRouter()
  const utils   = api.useUtils()
  const [error, setError] = useState<string | null>(null)

  // ── Mutation — selecciona el procedure según el modo ─────────────────────

  const createPersonal = api.ingredient.createPersonal.useMutation({
    onSuccess: (data) => {
      void utils.ingredient.getCatalog.invalidate()
      void utils.ingredient.getActive.invalidate()
      toast.success(`"${data.name}" añadido a tus ingredientes ✓`)
      router.push(redirectTo ?? "/ingredients")
    },
    onError: (e) => setError(e.message),
  })

  const createGlobal = api.ingredient.createGlobal.useMutation({
    onSuccess: (data) => {
      void utils.ingredient.getCatalog.invalidate()
      void utils.ingredient.getActive.invalidate()
      toast.success(`"${data.name}" añadido al catálogo global ✓`)
      router.push(redirectTo ?? "/superadmin")
    },
    onError: (e) => setError(e.message),
  })

  const isPending = createPersonal.isPending || createGlobal.isPending

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)

    const parseOptionalNumber = (key: string): number | null => {
      const v = fd.get(key)
      if (!v || v === "") return null
      const n = Number(v)
      return isNaN(n) ? null : n
    }

    const data = {
      name:              String(fd.get("name") ?? "").trim(),
      kcalPer100g:       Number(fd.get("kcalPer100g")),
      proteinPer100g:    Number(fd.get("proteinPer100g")),
      carbsPer100g:      Number(fd.get("carbsPer100g")),
      fatPer100g:        Number(fd.get("fatPer100g")),
      fiberPer100g:      parseOptionalNumber("fiberPer100g"),
      sodiumMgPer100g:   parseOptionalNumber("sodiumMgPer100g"),
      defaultPricePerKg: parseOptionalNumber("defaultPricePerKg"),
      emoji:             String(fd.get("emoji") ?? "").trim() || null,
      imageUrl:          String(fd.get("imageUrl") ?? "").trim() || null,
    }

    // Client-side quick validation
    if (!data.name) { setError("El nombre es obligatorio"); return }
    if (isNaN(data.kcalPer100g))    { setError("Kcal inválido"); return }
    if (isNaN(data.proteinPer100g)) { setError("Proteína inválida"); return }
    if (isNaN(data.carbsPer100g))   { setError("Carbos inválido"); return }
    if (isNaN(data.fatPer100g))     { setError("Grasa inválida"); return }

    if (mode === "global") {
      createGlobal.mutate(data)
    } else {
      createPersonal.mutate(data)
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white p-4 md:p-6">
      <div className="mx-auto max-w-xl">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Volver
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl shadow-lg shadow-amber-500/20">
              {mode === "global" ? "🌍" : "🥄"}
            </div>
            <div>
              <h1 className="text-xl font-black text-white">
                {mode === "global" ? "Nuevo ingrediente global" : "Añadir ingrediente personal"}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {mode === "global"
                  ? "Visible para todos los usuarios de la plataforma"
                  : "Solo visible en tu catálogo personal"}
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            ❌ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white/5 ring-1 ring-white/10 p-5">

          {/* Nombre + Emoji */}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field id="name" label="Nombre" type="text" required placeholder="Ej: Piña criolla" />
            <div>
              <label htmlFor="emoji" className="block text-xs font-semibold text-gray-400 mb-1.5">Emoji</label>
              <input id="emoji" name="emoji" type="text" maxLength={4} placeholder="🍍"
                className="w-16 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center text-lg focus:border-amber-500 focus:outline-none" />
            </div>
          </div>

          {/* Macros obligatorios */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Macronutrientes por 100g <span className="text-amber-400">*</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field id="kcalPer100g"    label="Kcal"    step="0.1" required />
              <Field id="proteinPer100g" label="Proteína (g)" step="0.1" required />
              <Field id="carbsPer100g"   label="Carbs (g)"    step="0.1" required />
              <Field id="fatPer100g"     label="Grasa (g)"    step="0.1" required />
            </div>
          </div>

          {/* Opcionales */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Opcionales</p>
            <div className="grid grid-cols-2 gap-3">
              <Field id="fiberPer100g"    label="Fibra (g)"    step="0.1" />
              <Field id="sodiumMgPer100g" label="Sodio (mg)"   step="0.1" />
            </div>
          </div>

          {/* Precio */}
          <Field
            id="defaultPricePerKg"
            label="Precio por kg (COP)"
            type="number"
            step="1"
            placeholder="Ej: 4500"
          />

          {/* URL imagen */}
          <Field
            id="imageUrl"
            label="URL de imagen"
            type="url"
            placeholder="https://..."
          />

          {/* Macro hint */}
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
            <p className="text-[11px] text-amber-400/70 leading-relaxed">
              💡 Los valores nutricionales se calculan dinámicamente — nunca se almacenan derivados.
              Asegúrate de ingresar valores por <strong>100g</strong>.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => router.back()}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-gray-400 hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-bold text-white
                hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {isPending ? "Guardando..." : mode === "global" ? "✓ Crear en catálogo global" : "✓ Añadir a mis ingredientes"}
            </button>
          </div>
        </form>

        {/* Personal mode — info box */}
        {mode === "personal" && (
          <div className="mt-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-400">¿Para qué sirve esto?</strong> Si hay un ingrediente que usas frecuentemente
              y no está en el catálogo principal, puedes añadirlo aquí. Solo aparece en tu
              catálogo personal — no afecta a otros usuarios.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
