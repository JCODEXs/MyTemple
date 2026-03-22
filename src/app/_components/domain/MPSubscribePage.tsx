"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams }   from "next/navigation"
import { toast }                        from "sonner"
import { api }                          from "@/trpc/react"

type PlanKey    = "ATHLETE" | "COACH"
type PayMethod  = "subscription" | "qr" | "link"

// ─── QR renderer (sin librería externa — usa la API de MP directamente) ──────

function QRDisplay({
  qrImage,
  qrData,
  expiresAt,
  onExpired,
}: {
  qrImage:   string
  qrData:    string
  expiresAt: Date
  onExpired: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { onExpired(); clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onExpired])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR image from MP */}
      <div className="relative rounded-2xl border-2 border-amber-500/30 bg-white p-4 shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrImage} alt="QR de pago" className="h-52 w-52 object-contain" />
        {secondsLeft === 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/70">
            <p className="font-black text-white text-sm">QR expirado</p>
          </div>
        )}
      </div>

      {/* Timer */}
      <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
        secondsLeft < 120 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-gray-300"
      }`}>
        <span>⏱</span>
        <span>Expira en {mins}:{secs.toString().padStart(2, "0")}</span>
      </div>

      {/* Instructions */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center max-w-xs space-y-2">
        <p className="text-xs font-bold text-gray-300">¿Cómo pagar?</p>
        {[
          "Abre tu app de MercadoPago, Nequi o Daviplata",
          "Toca el ícono de escanear QR",
          "Apunta la cámara a este código",
          "Confirma el pago",
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-left">
            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black flex items-center justify-center">
              {i + 1}
            </span>
            <p className="text-xs text-gray-500">{step}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan:     { name: string; amount: number; currency: string; features: string[] }
  selected: boolean
  onSelect: () => void
}) {
  const isCoach = plan.amount > 10000

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-3xl p-6 ring-2 transition-all ${
        selected
          ? "bg-white/10 ring-amber-500 shadow-xl shadow-amber-500/10"
          : "bg-white/5 ring-white/10 hover:ring-white/30"
      }`}>
      <div className={`inline-flex rounded-xl px-3 py-1 text-xs font-black text-white mb-4 ${
        isCoach ? "bg-gradient-to-r from-amber-500 to-orange-600" : "bg-gradient-to-r from-blue-500 to-blue-700"
      }`}>
        {plan.name}
      </div>

      <div className="flex items-end gap-1 mb-4">
        <span className="text-4xl font-black text-white">
          ${plan.amount.toLocaleString("es-CO")}
        </span>
        <span className="text-gray-500 mb-1 text-sm">COP / mes</span>
      </div>

      <ul className="space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs">
            <span className="text-amber-400 mt-0.5 flex-shrink-0">✓</span>
            <span className="text-gray-300">{f}</span>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="mt-4 rounded-xl bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-center text-xs font-bold text-amber-400">
          ✓ Seleccionado
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SubscribePage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const status    = searchParams.get("status")      // success | failure | pending
  const reference = searchParams.get("ref")

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("COACH")
  const [payMethod,    setPayMethod]    = useState<PayMethod>("link")
  const [qrData,       setQrData]       = useState<{
    qrImage: string; qrData: string; expiresAt: Date; reference: string
  } | null>(null)
  const [polling, setPolling]           = useState(false)
  const pollRef                         = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: plans } = api.subscription.getPlans.useQuery()

  // ── Verificar pago después del redirect (Checkout Pro) ──────────────────
  const verifyPayment = api.subscription.verifyPayment.useMutation({
    onSuccess: (data) => {
      if (data.activated) {
        toast.success("¡Pago confirmado! Activando tu cuenta...")
        setTimeout(() => router.push("/setup"), 1500)
      }
    },
  })

  useEffect(() => {
    if (status === "success" && reference) {
      verifyPayment.mutate({ reference })
    }
    if (status === "failure") {
      toast.error("El pago no pudo procesarse. Intenta de nuevo.")
    }
    if (status === "pending") {
      toast("Pago pendiente de confirmación — te notificaremos por email.")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reference])

  // ── Poll mientras QR está activo ──────────────────────────────────────────
  useEffect(() => {
    if (qrData && !polling) {
      setPolling(true)
      pollRef.current = setInterval(async () => {
        const res = await verifyPayment.mutateAsync({ reference: qrData.reference })
          .catch(() => null)
        if (res?.activated) {
          clearInterval(pollRef.current!)
          setPolling(false)
          toast.success("¡QR escaneado y pago confirmado!")
          setTimeout(() => router.push("/setup"), 1500)
        }
      }, 4000)  // verificar cada 4s
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrData?.reference])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createSubscription = api.subscription.createSubscriptionCheckout.useMutation({
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl
    },
    onError: (e) => toast.error(e.message),
  })

  const createQR = api.subscription.createQRPayment.useMutation({
    onSuccess: (data) => {
      setQrData({
        qrImage:   data.qrImage,
        qrData:    data.qrData,
        expiresAt: new Date(data.expiresAt),
        reference: data.reference,
      })
    },
    onError: (e) => toast.error(e.message),
  })

  const createLink = api.subscription.createPaymentLink.useMutation({
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl
    },
    onError: (e) => toast.error(e.message),
  })

  const handlePay = () => {
    const base      = window.location.origin
    const returnUrl = `${base}/auth/subscribe`

    if (payMethod === "subscription") {
      createSubscription.mutate({ plan: selectedPlan, returnUrl })
    } else if (payMethod === "qr") {
      createQR.mutate({ plan: selectedPlan })
    } else {
      createLink.mutate({ plan: selectedPlan })
    }
  }

  const isPending = createSubscription.isPending || createQR.isPending || createLink.isPending

  // ── Loading state ─────────────────────────────────────────────────────────

  if (verifyPayment.isPending && status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c10]">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500
            flex items-center justify-center text-3xl animate-pulse shadow-2xl shadow-amber-500/30">
            ⚡
          </div>
          <p className="text-xl font-black text-white">Verificando pago...</p>
          <p className="text-sm text-gray-500">Confirmando con MercadoPago</p>
        </div>
      </div>
    )
  }

  // ── QR view ────────────────────────────────────────────────────────────────

  if (qrData) {
    const meta = plans?.[selectedPlan]
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c10] p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
              Escanea para pagar
            </p>
            <h2 className="text-2xl font-black text-white">
              {meta?.name} · ${meta?.amount.toLocaleString("es-CO")} COP
            </h2>
          </div>

          <QRDisplay
            qrImage={qrData.qrImage}
            qrData={qrData.qrData}
            expiresAt={qrData.expiresAt}
            onExpired={() => {
              setQrData(null)
              clearInterval(pollRef.current!)
              toast.error("El QR expiró. Genera uno nuevo.")
            }}
          />

          {polling && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <div className="h-3 w-3 animate-spin rounded-full border border-amber-500 border-t-transparent" />
              Esperando confirmación de pago...
            </div>
          )}

          <button
            onClick={() => { setQrData(null); clearInterval(pollRef.current!) }}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← Volver a métodos de pago
          </button>
        </div>
      </div>
    )
  }

  // ── Main checkout UI ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl
            bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-xl shadow-amber-500/20">
            ⚡
          </div>
          <h1 className="text-3xl font-black text-white">Activa tu plan</h1>
          <p className="text-gray-500 text-sm mt-2">
            Pago seguro · Cancela cuando quieras
          </p>
        </div>

        {/* Plan selection */}
        {plans && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(["ATHLETE", "COACH"] as PlanKey[]).map((key) => (
              <PlanCard
                key={key}
                plan={plans[key]!}
                selected={selectedPlan === key}
                onSelect={() => setSelectedPlan(key)}
              />
            ))}
          </div>
        )}

        {/* Payment method */}
        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Método de pago
          </p>

          {[
            {
              id:    "link" as PayMethod,
              label: "Checkout MercadoPago",
              desc:  "Tarjeta, PSE, Nequi, Daviplata — redirige a MP",
              icon:  "💳",
            },
            {
              id:    "qr" as PayMethod,
              label: "QR Dinámico",
              desc:  "Escanea con cualquier app de pago",
              icon:  "📱",
            },
            {
              id:    "subscription" as PayMethod,
              label: "Suscripción automática",
              desc:  "Pago mensual automático con tarjeta",
              icon:  "🔄",
            },
          ].map((method) => (
            <button key={method.id}
              onClick={() => setPayMethod(method.id)}
              className={`w-full flex items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-all ${
                payMethod === method.id
                  ? "bg-amber-500/20 ring-1 ring-amber-500/50"
                  : "bg-white/5 hover:bg-white/10"
              }`}>
              <span className="text-2xl flex-shrink-0">{method.icon}</span>
              <div>
                <p className="text-sm font-bold text-white">{method.label}</p>
                <p className="text-xs text-gray-500">{method.desc}</p>
              </div>
              {payMethod === method.id && (
                <span className="ml-auto text-amber-400 text-sm">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={isPending}
          className="w-full rounded-2xl bg-gradient-to-r from-[#009EE3] to-[#00BCFF]
            py-4 text-base font-bold text-white shadow-xl
            hover:from-[#0080C0] hover:to-[#009EE3]
            disabled:opacity-50 transition-all active:scale-[0.98]
            flex items-center justify-center gap-3">
          {isPending ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {payMethod === "qr" ? "Generando QR..." : "Redirigiendo..."}
            </>
          ) : (
            <>
              <span className="text-xl">
                {payMethod === "qr" ? "📱" : "💳"}
              </span>
              {payMethod === "qr"
                ? `Generar QR · $${plans?.[selectedPlan]?.amount.toLocaleString("es-CO")} COP`
                : `Pagar con MercadoPago · $${plans?.[selectedPlan]?.amount.toLocaleString("es-CO")} COP`
              }
            </>
          )}
        </button>

        {/* Trial skip */}
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-xl py-2.5 text-xs text-gray-600 hover:text-gray-400 transition-colors text-center">
          Continuar en modo trial (30 días gratis) →
        </button>
      </div>
    </div>
  )
}
