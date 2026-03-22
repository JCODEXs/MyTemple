"use client"

// ─────────────────────────────────────────────────────────────────────────────
// src/components/auth/SubscribePage.tsx
// Página de checkout: /auth/subscribe
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast }  from "sonner"
import { api }    from "@/trpc/react"

type PlanKey = "ATHLETE" | "COACH"

const PLAN_DISPLAY = {
  ATHLETE: {
    name:     "Plan Atleta",
    price:    "$3.000",
    period:   "/ mes",
    color:    "from-blue-500 to-blue-700",
    features: [
      "Motor energético adaptativo",
      "Recetas con nutrición dinámica",
      "Planes nutricionales inteligentes",
      "13 deportes con cálculo MET",
      "Progress journal personal",
    ],
  },
  COACH: {
    name:     "Plan Coach",
    price:    "$29.000",
    period:   "/ mes",
    color:    "from-amber-500 to-orange-600",
    features: [
      "Todo lo del plan Atleta",
      "Hasta 20 clientes vinculados",
      "Dashboard energético por cliente",
      "Asignación de planes nutricionales",
      "Retos semanales a clientes",
      "Códigos de invitación ilimitados",
      "Chat directo con clientes",
    ],
  },
}

export default function SubscribePage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // Si vuelve de PayPal con subscription_id → activar
  const subscriptionId  = searchParams.get("subscription_id")
  const planFromQuery   = (searchParams.get("plan") ?? "COACH") as PlanKey
  const baToken         = searchParams.get("ba_token")   // PayPal token
  const token           = searchParams.get("token")

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(planFromQuery)
  const [loading,      setLoading]      = useState(false)
  const [activating,   setActivating]   = useState(false)

  // Activar suscripción si viene de PayPal redirect
  const activate = api.subscription.activate.useMutation({
    onSuccess: () => {
      toast.success("¡Suscripción activada! Bienvenido a MyTemple.")
      router.push("/setup")
    },
    onError: (e) => {
      toast.error(`Error al activar: ${e.message}`)
      setActivating(false)
    },
  })

  useEffect(() => {
    if (subscriptionId && !activating) {
      setActivating(true)
      activate.mutate({
        subscriptionId,
        plan: planFromQuery,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId])

  const createCheckout = api.subscription.createCheckout.useMutation({
    onSuccess: ({ approvalUrl }) => {
      // Redirigir a PayPal
      window.location.href = approvalUrl
    },
    onError: (e) => {
      toast.error(`Error: ${e.message}`)
      setLoading(false)
    },
  })

  const handleSubscribe = (plan: PlanKey) => {
    setLoading(true)
    setSelectedPlan(plan)

    const base      = window.location.origin
    const returnUrl = `${base}/auth/subscribe?plan=${plan}&subscription_id={subscription_id}`
    const cancelUrl = `${base}/auth/subscribe?cancelled=true`

    createCheckout.mutate({ plan, returnUrl, cancelUrl })
  }

  // ── Activating state ──────────────────────────────────────────────────────

  if (activating || activate.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c10]">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500
            flex items-center justify-center text-3xl shadow-2xl shadow-amber-500/30 animate-pulse">
            ⚡
          </div>
          <p className="text-xl font-black text-white">Activando tu suscripción...</p>
          <p className="text-sm text-gray-500">Verificando el pago con PayPal</p>
        </div>
      </div>
    )
  }

  // ── Cancelled state ───────────────────────────────────────────────────────

  if (searchParams.get("cancelled")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c10] p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">😕</div>
          <h2 className="text-xl font-black text-white">Pago cancelado</h2>
          <p className="text-sm text-gray-500">No se realizó ningún cargo. Puedes intentarlo cuando quieras.</p>
          <button onClick={() => router.replace("/auth/subscribe")}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600">
            Intentar de nuevo
          </button>
          <button onClick={() => router.push("/dashboard")}
            className="w-full rounded-xl bg-white/5 py-3 text-sm text-gray-400 hover:bg-white/10">
            Ir al dashboard (modo trial)
          </button>
        </div>
      </div>
    )
  }

  // ── Checkout UI ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl
            bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-xl shadow-amber-500/20">
            ⚡
          </div>
          <h1 className="text-3xl font-black text-white">Activa tu plan</h1>
          <p className="text-gray-500 text-sm mt-2">
            Pago seguro vía PayPal · Cancela cuando quieras
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
          {(["ATHLETE", "COACH"] as PlanKey[]).map((plan) => {
            const meta      = PLAN_DISPLAY[plan]
            const isSelected = selectedPlan === plan

            return (
              <div key={plan}
                onClick={() => setSelectedPlan(plan)}
                className={`cursor-pointer rounded-3xl p-6 ring-2 transition-all ${
                  isSelected
                    ? "bg-white/10 ring-amber-500 shadow-xl shadow-amber-500/10"
                    : "bg-white/5 ring-white/10 hover:ring-white/30"
                }`}>

                <div className={`inline-flex rounded-xl bg-gradient-to-r ${meta.color} px-3 py-1 text-xs font-black text-white mb-4`}>
                  {meta.name}
                </div>

                <div className="flex items-end gap-1 mb-4">
                  <span className="text-4xl font-black text-white">{meta.price}</span>
                  <span className="text-gray-500 mb-1 text-sm">{meta.period}</span>
                </div>

                <ul className="space-y-2">
                  {meta.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <span className="text-amber-400 mt-0.5 flex-shrink-0">✓</span>
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                {isSelected && (
                  <div className="mt-4 rounded-xl bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-center text-xs font-bold text-amber-400">
                    ✓ Seleccionado
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* PayPal button */}
        <button
          onClick={() => handleSubscribe(selectedPlan)}
          disabled={loading || createCheckout.isPending}
          className="w-full rounded-2xl bg-[#0070BA] hover:bg-[#005ea6] disabled:opacity-50
            py-4 text-base font-bold text-white shadow-xl transition-all active:scale-[0.98]
            flex items-center justify-center gap-3">
          {loading || createCheckout.isPending ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Redirigiendo a PayPal...
            </>
          ) : (
            <>
              <svg className="h-6" viewBox="0 0 101 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.337 2.338H5.5c-.483 0-.894.35-.97.826L1.773 19.3a.583.583 0 0 0 .576.675h3.239a.97.97 0 0 0 .97-.826l.711-4.498a.97.97 0 0 1 .97-.826h2.176c4.528 0 7.14-2.19 7.824-6.532.308-1.898.013-3.39-.876-4.436-.977-1.149-2.71-1.52-5.026-1.52z" fill="white"/>
                <path d="M13.23 8.918c-.376 2.464-2.263 2.464-4.09 2.464H8.07l.73-4.617c.044-.277.284-.48.565-.48h.496c1.243 0 2.417 0 3.022.709.362.423.472 1.051.347 1.924z" fill="white"/>
              </svg>
              Pagar con PayPal · {PLAN_DISPLAY[selectedPlan].price}{PLAN_DISPLAY[selectedPlan].period}
            </>
          )}
        </button>

        <p className="mt-4 text-center text-xs text-gray-600">
          Al suscribirte aceptas los términos de servicio. Puedes cancelar en cualquier momento desde tu perfil.
        </p>

        {/* Skip to trial */}
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-3 w-full rounded-xl py-2.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
          Continuar en modo trial (30 días gratis) →
        </button>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// src/components/domain/SubscriptionStatus.tsx
// Bloque de estado para el tab "Cuenta" del ProfilePage
// ─────────────────────────────────────────────────────────────────────────────

export function SubscriptionStatus() {
  const router  = useRouter()
  const utils   = api.useUtils()
  const [confirmCancel, setConfirmCancel] = useState(false)

  const { data: status, isLoading } = api.subscription.getStatus.useQuery(
    undefined,
    { staleTime: 5 * 60_000 }
  )

  const cancel = api.subscription.cancel.useMutation({
    onSuccess: (data) => {
      void utils.subscription.getStatus.invalidate()
      setConfirmCancel(false)
      const until = data.activeUntil
        ? new Date(data.activeUntil).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
        : "fin del período"
      toast.success(`Suscripción cancelada. Sigue activa hasta el ${until}.`)
    },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) {
    return <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
  }

  if (!status) {
    return (
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">💳 Suscripción</p>
        <p className="text-sm text-gray-500">Sin suscripción activa</p>
        <button
          onClick={() => router.push("/auth/subscribe")}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors">
          Activar plan
        </button>
      </div>
    )
  }

  const STATUS_META = {
    ACTIVE:    { label: "Activa",    color: "text-green-400 bg-green-500/20",  icon: "✓" },
    TRIAL:     { label: "Trial",     color: "text-blue-400 bg-blue-500/20",    icon: "⏳" },
    CANCELLED: { label: "Cancelada", color: "text-gray-400 bg-gray-500/20",   icon: "✕" },
    PAST_DUE:  { label: "Vencida",   color: "text-red-400 bg-red-500/20",     icon: "⚠️" },
  }

  const meta = STATUS_META[status.status as keyof typeof STATUS_META] ?? STATUS_META.TRIAL

  return (
    <>
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">💳 Suscripción</p>

        {/* Status badge + plan */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-white">{status.planName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {status.isOnTrial
                ? `Trial · ${status.trialDaysLeft ?? 0} días restantes`
                : status.daysLeft !== null
                ? `Renueva en ${status.daysLeft} días`
                : "Sin fecha de renovación"}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
        </div>

        {/* Period bar */}
        {status.currentPeriodEnd && status.status === "ACTIVE" && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>Período actual</span>
              <span>{new Date(status.currentPeriodEnd).toLocaleDateString("es-CO")}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                style={{
                  width: `${Math.max(5, Math.min(100, ((status.daysLeft ?? 0) / 30) * 100))}%`
                }}
              />
            </div>
          </div>
        )}

        {/* PAST_DUE alert */}
        {status.status === "PAST_DUE" && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-xs font-bold text-red-400 mb-1">⚠️ Pago fallido</p>
            <p className="text-xs text-red-400/70">
              Tu acceso será restringido. Actualiza tu método de pago en PayPal.
            </p>
            <button
              onClick={() => router.push("/auth/subscribe")}
              className="mt-2 w-full rounded-lg bg-red-500 py-2 text-xs font-bold text-white hover:bg-red-600">
              Reactivar suscripción
            </button>
          </div>
        )}

        {/* Trial expiring warning */}
        {status.isOnTrial && (status.trialDaysLeft ?? 0) <= 7 && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <p className="text-xs font-bold text-amber-400 mb-1">
              ⏳ Trial expira en {status.trialDaysLeft} días
            </p>
            <p className="text-xs text-amber-400/70">
              Activa tu suscripción para no perder el acceso.
            </p>
            <button
              onClick={() => router.push("/auth/subscribe")}
              className="mt-2 w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600">
              Activar ahora
            </button>
          </div>
        )}

        {/* Cancel button — solo si ACTIVE */}
        {status.status === "ACTIVE" && !status.cancelAtPeriodEnd && (
          <button
            onClick={() => setConfirmCancel(true)}
            className="w-full rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors">
            Cancelar suscripción
          </button>
        )}

        {status.cancelAtPeriodEnd && (
          <div className="rounded-xl bg-white/5 px-4 py-3 text-center">
            <p className="text-xs text-gray-500">
              Cancelación programada · Acceso hasta{" "}
              {status.currentPeriodEnd
                ? new Date(status.currentPeriodEnd).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
                : "fin del período"}
            </p>
          </div>
        )}
      </div>

      {/* Cancel confirm dialog */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-[#1a1a2e] p-6 shadow-2xl ring-1 ring-white/10">
            <h3 className="font-bold text-white mb-2">¿Cancelar suscripción?</h3>
            <p className="text-sm text-gray-400 mb-2">
              Seguirás teniendo acceso hasta el fin del período de facturación actual.
            </p>
            {status.currentPeriodEnd && (
              <p className="text-sm font-bold text-amber-400 mb-5">
                Acceso hasta: {new Date(status.currentPeriodEnd).toLocaleDateString("es-CO", {
                  weekday: "long", day: "numeric", month: "long"
                })}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCancel(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:bg-white/5">
                Mantener
              </button>
              <button
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
                {cancel.isPending ? "Cancelando..." : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
