import { db } from "@/server/db"

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN — reemplaza estos valores con los reales
// ─────────────────────────────────────────────────────────────────────────────

const MP_BASE        = process.env.MP_BASE_URL        ?? "https://api.mercadopago.com"
const ACCESS_TOKEN   = process.env.MP_ACCESS_TOKEN    ?? "TEST-REEMPLAZAR"
const PLAN_ATHLETE   = process.env.MP_PLAN_ID_ATHLETE ?? "PLAN_ATLETA_ID"
const PLAN_COACH     = process.env.MP_PLAN_ID_COACH   ?? "PLAN_COACH_ID"

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanKey = "ATHLETE" | "COACH"

export const PLAN_META: Record<PlanKey, {
  id:       string
  name:     string
  amount:   number
  currency: string
  features: string[]
}> = {
  ATHLETE: {
    id:       PLAN_ATHLETE,
    name:     "Plan Atleta",
    amount:   3000,
    currency: "COP",
    features: [
      "Motor energético adaptativo",
      "Recetas con nutrición dinámica",
      "Planes nutricionales inteligentes",
      "13 deportes con cálculo MET",
      "Progress journal personal",
    ],
  },
  COACH: {
    id:       PLAN_COACH,
    name:     "Plan Coach",
    amount:   29000,
    currency: "COP",
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

// ─── MP API helper ────────────────────────────────────────────────────────────

async function mpRequest<T>(
  path:   string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?:  unknown
): Promise<T> {
  const res = await fetch(`${MP_BASE}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MercadoPago API ${res.status}: ${err}`)
  }

  return res.json() as Promise<T>
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const MPSubscriptionService = {

  // ── 1. SUSCRIPCIÓN RECURRENTE ─────────────────────────────────────────────
  //    El usuario completa sus datos de tarjeta en el checkout de MP.
  //    MP crea la suscripción y la cobra mensualmente de forma automática.

  async createSubscriptionCheckout(
    userId:    string,
    plan:      PlanKey,
    returnUrl: string
  ) {
    const user = await db.user.findUnique({
      where:  { id: userId },
      select: { email: true, name: true },
    })

    const meta = PLAN_META[plan]

    const data = await mpRequest<{
      id:       string
      init_point: string
      status:   string
    }>("/preapproval", "POST", {
      preapproval_plan_id: meta.id,
      reason:              `${meta.name} - MyTemple`,
      payer_email:         user?.email,
      back_url:            returnUrl,
      auto_recurring: {
        frequency:          1,
        frequency_type:     "months",
        transaction_amount: meta.amount,
        currency_id:        meta.currency,
      },
      external_reference: userId,    // para identificar al usuario en webhook
      status:             "pending",
    })

    return {
      subscriptionId: data.id,
      checkoutUrl:    data.init_point,  // redirigir aquí al usuario
    }
  },

  // ── 2. QR DINÁMICO ────────────────────────────────────────────────────────
  //    Genera un QR de pago único (no recurrente).
  //    El usuario escanea con la app de MP, Nequi, Daviplata, PSE.
  //    Al pagar, el webhook activa la cuenta por 30 días.
  //    Útil para usuarios sin tarjeta o para el primer pago.

  async createQRPayment(
    userId:    string,
    plan:      PlanKey,
    storeId:   string = process.env.MP_STORE_ID    ?? "STORE_ID_REEMPLAZAR",
    posId:     string = process.env.MP_POS_ID      ?? "POS_ID_REEMPLAZAR"
  ) {
    const meta      = PLAN_META[plan]
    const reference = `mytemple_${userId}_${plan}_${Date.now()}`

    // Guardar referencia en DB para validar el webhook
    await db.pendingPayment.create({
      data: {
        userId,
        reference,
        plan,
        amount:    meta.amount,
        currency:  meta.currency,
        method:    "QR",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
      },
    })

    const data = await mpRequest<{
      qr_data:   string   // string para generar QR en frontend
      qr_image:  string   // URL de imagen del QR
      in_store_order_id: string
    }>(`/instore/orders/qr/seller/collectors/${process.env.MP_USER_ID}/pos/${posId}/qrs`, "POST", {
      external_reference: reference,
      title:              `${meta.name} - MyTemple`,
      description:        `Suscripción mensual ${meta.name}`,
      notification_url:   `${process.env.NEXTAUTH_URL}/api/webhooks/mp`,
      total_amount:       meta.amount,
      items: [{
        sku_number:  plan,
        category:    "services",
        title:       meta.name,
        description: `Acceso mensual a MyTemple - ${meta.name}`,
        unit_price:  meta.amount,
        quantity:    1,
        unit_measure: "unit",
        total_amount: meta.amount,
      }],
    })

    return {
      qrData:    data.qr_data,    // usar con librería qrcode para renderizar
      qrImage:   data.qr_image,   // o mostrar esta imagen directamente
      reference,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    }
  },

  // ── 3. LINK DE PAGO SIMPLE (fallback sin QR store) ────────────────────────
  //    Si no tienes store/pos configurado en MP, usa Checkout Pro
  //    que genera un link de pago sin necesidad de store.

  async createPaymentLink(userId: string, plan: PlanKey) {
    const meta      = PLAN_META[plan]
    const reference = `mytemple_${userId}_${plan}_${Date.now()}`

    await db.pendingPayment.create({
      data: {
        userId,
        reference,
        plan,
        amount:    meta.amount,
        currency:  meta.currency,
        method:    "LINK",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    })

    const data = await mpRequest<{
      id:         string
      init_point: string  // URL para redirigir
      sandbox_init_point: string
    }>("/checkout/preferences", "POST", {
      items: [{
        id:          plan,
        title:       meta.name,
        description: `Suscripción mensual ${meta.name} - MyTemple`,
        quantity:    1,
        unit_price:  meta.amount,
        currency_id: meta.currency,
      }],
      payer:              { email: undefined },  // MP lo pide al usuario
      external_reference: reference,
      notification_url:   `${process.env.NEXTAUTH_URL}/api/webhooks/mp`,
      back_urls: {
        success: `${process.env.NEXTAUTH_URL}/auth/subscribe?status=success&ref=${reference}`,
        failure: `${process.env.NEXTAUTH_URL}/auth/subscribe?status=failure`,
        pending: `${process.env.NEXTAUTH_URL}/auth/subscribe?status=pending&ref=${reference}`,
      },
      auto_return: "approved",
    })

    return {
      preferenceId: data.id,
      // En sandbox usar sandbox_init_point, en producción usar init_point
      checkoutUrl: process.env.NODE_ENV === "production"
        ? data.init_point
        : data.sandbox_init_point,
      reference,
    }
  },

  // ── ACTIVAR SUSCRIPCIÓN ───────────────────────────────────────────────────

  async activateFromReference(reference: string) {
    const pending = await db.pendingPayment.findUnique({
      where: { reference },
    })
    if (!pending) throw new Error(`Pending payment not found: ${reference}`)
    if (pending.activated) throw new Error("Already activated")

    const plan = pending.plan as PlanKey

    return MPSubscriptionService._activateUser(pending.userId, plan, reference)
  },

  async activateFromSubscriptionId(mpSubscriptionId: string, userId: string, plan: PlanKey) {
    return MPSubscriptionService._activateUser(userId, plan, mpSubscriptionId)
  },

  async _activateUser(userId: string, plan: PlanKey, ref: string) {
    const periodEnd = new Date(Date.now() + 30 * 86400000)

    await db.$transaction([
      db.subscription.upsert({
        where:  { userId },
        create: {
          userId,
          paypalSubscriptionId: ref,   // reutilizamos el campo para MP también
          status:               "ACTIVE",
          currentPeriodEnd:     periodEnd,
          clientCodeCredits:    plan === "COACH" ? 20 : 0,
        },
        update: {
          paypalSubscriptionId: ref,
          status:               "ACTIVE",
          currentPeriodEnd:     periodEnd,
          trialEndsAt:          null,
          cancelAtPeriodEnd:    false,
        },
      }),
      // Marcar pending como activado
      ...(await db.pendingPayment.findUnique({ where: { reference: ref } })
        ? [db.pendingPayment.update({
            where: { reference: ref },
            data:  { activated: true, activatedAt: new Date() },
          })]
        : []
      ),
    ])

    // Promover a COACH si aplica
    if (plan === "COACH") {
      await db.user.update({
        where: { id: userId },
        data:  { role: "COACH" },
      })
    }

    return { success: true, periodEnd, plan }
  },

  // ── CANCELAR ──────────────────────────────────────────────────────────────

  async cancelSubscription(userId: string) {
    const sub = await db.subscription.findUnique({ where: { userId } })
    if (!sub?.paypalSubscriptionId) throw new Error("No subscription found")

    // Cancelar en MP si es suscripción recurrente (empieza con ID largo)
    try {
      await mpRequest(
        `/preapproval/${sub.paypalSubscriptionId}`,
        "PUT",
        { status: "cancelled" }
      )
    } catch {
      // Si falla (ej: era un pago único), solo marcar en DB
      console.warn("[MP] Could not cancel in MP, marking locally only")
    }

    await db.subscription.update({
      where: { userId },
      data:  { status: "CANCELLED", cancelAtPeriodEnd: true },
    })

    return { success: true, activeUntil: sub.currentPeriodEnd }
  },

  // ── STATUS ────────────────────────────────────────────────────────────────

  async getStatus(userId: string) {
    const sub = await db.subscription.findUnique({ where: { userId } })
    if (!sub) return null

    const now           = new Date()
    const daysLeft      = sub.currentPeriodEnd
      ? Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / 86400000))
      : null
    const isOnTrial     = sub.status === "TRIAL" && !!sub.trialEndsAt && sub.trialEndsAt > now
    const trialDaysLeft = sub.trialEndsAt
      ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / 86400000))
      : null

    // Determinar nombre del plan por créditos
    const planName = sub.clientCodeCredits > 0 ? "Coach" : "Atleta"

    return {
      ...sub,
      daysLeft,
      isOnTrial,
      trialDaysLeft,
      planName,
    }
  },

  // ── WEBHOOK HANDLERS ──────────────────────────────────────────────────────

  async handleWebhook(type: string, data: { id?: string | number }) {
    console.log(`[MP Webhook] ${type}`, data.id)

    // ── Pago único aprobado (QR o link) ──────────────────────────────────
    if (type === "payment") {
      const payment = await mpRequest<{
        status:             string
        external_reference: string
        transaction_amount: number
      }>(`/v1/payments/${data.id}`)

      if (payment.status !== "approved") return

      const ref = payment.external_reference
      if (!ref?.startsWith("mytemple_")) return

      const pending = await db.pendingPayment.findUnique({ where: { reference: ref } })
      if (!pending || pending.activated) return

      await MPSubscriptionService.activateFromReference(ref)
      console.log(`[MP Webhook] Activated via payment: ${ref}`)
      return
    }

    // ── Suscripción recurrente autorizada ─────────────────────────────────
    if (type === "preapproval") {
      const sub = await mpRequest<{
        status:             string
        external_reference: string  // userId
        preapproval_plan_id: string
      }>(`/preapproval/${data.id}`)

      if (sub.status !== "authorized") return

      const userId = sub.external_reference
      if (!userId) return

      // Determinar plan por plan_id
      const plan: PlanKey = sub.preapproval_plan_id === PLAN_COACH ? "COACH" : "ATHLETE"

      await MPSubscriptionService.activateFromSubscriptionId(
        String(data.id),
        userId,
        plan
      )
      console.log(`[MP Webhook] Activated subscription: ${data.id} for user: ${userId}`)
      return
    }

    // ── Suscripción cancelada / pausada ───────────────────────────────────
    if (type === "subscription_preapproval") {
      const sub = await mpRequest<{
        status:             string
        external_reference: string
      }>(`/preapproval/${data.id}`)

      if (sub.status === "cancelled" || sub.status === "paused") {
        const userId = sub.external_reference
        if (!userId) return

        await db.subscription.updateMany({
          where: { userId },
          data:  { status: "CANCELLED" },
        })
        console.log(`[MP Webhook] Subscription cancelled for user: ${userId}`)
      }
    }
  },
}
