import { db } from "@/server/db"

// ─── PayPal API helpers ───────────────────────────────────────────────────────

const PAYPAL_BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com"

async function getPayPalToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64")

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  "POST",
    headers: {
      Authorization:  `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function paypalRequest<T>(
  path:    string,
  method:  "GET" | "POST" | "PATCH" = "GET",
  body?:   unknown
): Promise<T> {
  const token = await getPayPalToken()
  const res   = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal API error ${res.status}: ${err}`)
  }

  return res.json() as Promise<T>
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanKey = "ATHLETE" | "COACH"

const PLAN_IDS: Record<PlanKey, string> = {
  ATHLETE: process.env.PAYPAL_PLAN_ID_ATHLETE ?? "",
  COACH:   process.env.PAYPAL_PLAN_ID_COACH   ?? "",
}

const PLAN_PRICES: Record<PlanKey, { amount: string; currency: string; label: string }> = {
  ATHLETE: { amount: "3000",  currency: "COP", label: "Plan Atleta"  },
  COACH:   { amount: "29000", currency: "COP", label: "Plan Coach"   },
}

interface PayPalSubscription {
  id:     string
  status: string
  start_time: string
  billing_info?: {
    next_billing_time?: string
    last_payment?:      { time: string }
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const SubscriptionService = {

  getPlanId(plan: PlanKey): string {
    return PLAN_IDS[plan]
  },

  getPlanMeta(plan: PlanKey) {
    return PLAN_PRICES[plan]
  },

  /**
   * Crea una suscripción en PayPal y retorna el approval_url
   * para redirigir al usuario a aprobar el pago.
   */
  async createPayPalSubscription(
    userId:      string,
    plan:        PlanKey,
    returnUrl:   string,
    cancelUrl:   string
  ) {
    const planId = PLAN_IDS[plan]
    if (!planId) throw new Error(`Plan ID not configured for: ${plan}`)

    const user = await db.user.findUnique({
      where:  { id: userId },
      select: { email: true, name: true },
    })

    const data = await paypalRequest<{
      id: string
      links: { href: string; rel: string }[]
    }>("/v1/billing/subscriptions", "POST", {
      plan_id: planId,
      subscriber: {
        email_address: user?.email,
        name: {
          given_name: user?.name?.split(" ")[0] ?? "",
          surname:    user?.name?.split(" ").slice(1).join(" ") ?? "",
        },
      },
      application_context: {
        brand_name:          "MyTemple",
        locale:              "es-CO",
        shipping_preference: "NO_SHIPPING",
        user_action:         "SUBSCRIBE_NOW",
        return_url:          returnUrl,
        cancel_url:          cancelUrl,
      },
      custom_id: userId,  // para identificar al usuario en el webhook
    })

    const approvalUrl = data.links.find((l) => l.rel === "approve")?.href
    if (!approvalUrl) throw new Error("PayPal did not return approval URL")

    return { subscriptionId: data.id, approvalUrl }
  },

  /**
   * Verifica y activa la suscripción después del redirect de PayPal.
   * PayPal llama al webhook BILLING.SUBSCRIPTION.ACTIVATED pero
   * también verificamos manualmente al volver a la app.
   */
  async activateSubscription(
    userId:         string,
    subscriptionId: string,
    plan:           PlanKey
  ) {
    // Verificar estado en PayPal
    const paypalSub = await paypalRequest<PayPalSubscription>(
      `/v1/billing/subscriptions/${subscriptionId}`
    )

    if (paypalSub.status !== "ACTIVE" && paypalSub.status !== "APPROVED") {
      throw new Error(`Subscription not active: ${paypalSub.status}`)
    }

    const periodEnd = paypalSub.billing_info?.next_billing_time
      ? new Date(paypalSub.billing_info.next_billing_time)
      : new Date(Date.now() + 30 * 86400000)

    // Upsert en DB
    await db.subscription.upsert({
      where:  { userId },
      create: {
        userId,
        paypalSubscriptionId: subscriptionId,
        paypalPlanId:         PLAN_IDS[plan],
        status:               "ACTIVE",
        currentPeriodEnd:     periodEnd,
        clientCodeCredits:    plan === "COACH" ? 20 : 0,
      },
      update: {
        paypalSubscriptionId: subscriptionId,
        paypalPlanId:         PLAN_IDS[plan],
        status:               "ACTIVE",
        currentPeriodEnd:     periodEnd,
        trialEndsAt:          null,
      },
    })

    // Promover a COACH si el plan es COACH y no lo es todavía
    if (plan === "COACH") {
      await db.user.update({
        where: { id: userId },
        data:  { role: "COACH" },
      })
    }

    return { success: true, periodEnd }
  },

  /**
   * El coach cancela su suscripción desde el perfil.
   */
  async cancelSubscription(userId: string) {
    const sub = await db.subscription.findUnique({ where: { userId } })
    if (!sub?.paypalSubscriptionId) {
      throw new Error("No active subscription found")
    }

    // Cancelar en PayPal
    await paypalRequest(
      `/v1/billing/subscriptions/${sub.paypalSubscriptionId}/cancel`,
      "POST",
      { reason: "User requested cancellation" }
    )

    // Marcar como cancelada — sigue activa hasta fin del período
    await db.subscription.update({
      where: { userId },
      data:  {
        status:           "CANCELLED",
        cancelAtPeriodEnd: true,
      },
    })

    return { success: true, activeUntil: sub.currentPeriodEnd }
  },

  /**
   * Obtiene el estado de suscripción del usuario para mostrar en el perfil.
   */
  async getStatus(userId: string) {
    const sub = await db.subscription.findUnique({ where: { userId } })
    if (!sub) return null

    const now          = new Date()
    const isExpired    = sub.currentPeriodEnd ? sub.currentPeriodEnd < now : false
    const daysLeft     = sub.currentPeriodEnd
      ? Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / 86400000))
      : null

    const isOnTrial    = sub.status === "TRIAL" && sub.trialEndsAt && sub.trialEndsAt > now
    const trialDaysLeft = sub.trialEndsAt
      ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / 86400000))
      : null

    return {
      ...sub,
      isExpired,
      daysLeft,
      isOnTrial,
      trialDaysLeft,
      planName: sub.paypalPlanId === PLAN_IDS.COACH ? "Coach" : "Atleta",
    }
  },

  // ── Webhook handlers ─────────────────────────────────────────────────────

  async handleWebhook(eventType: string, resource: Record<string, unknown>) {
    console.log(`[PayPal Webhook] ${eventType}`, resource.id)

    switch (eventType) {

      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const subscriptionId = resource.id as string
        const userId         = resource.custom_id as string
        if (!userId || !subscriptionId) break

        const periodEnd = (resource.billing_info as any)?.next_billing_time
          ? new Date((resource.billing_info as any).next_billing_time)
          : new Date(Date.now() + 30 * 86400000)

        await db.subscription.upsert({
          where:  { userId },
          create: {
            userId,
            paypalSubscriptionId: subscriptionId,
            status:               "ACTIVE",
            currentPeriodEnd:     periodEnd,
          },
          update: {
            status:           "ACTIVE",
            currentPeriodEnd: periodEnd,
          },
        })
        break
      }

      case "PAYMENT.SALE.COMPLETED": {
        // Pago mensual exitoso — renovar período
        const billingAgreementId = (resource as any).billing_agreement_id as string | undefined
        if (!billingAgreementId) break

        const sub = await db.subscription.findFirst({
          where: { paypalSubscriptionId: billingAgreementId },
        })
        if (!sub) break

        const newPeriodEnd = new Date(Date.now() + 30 * 86400000)
        await db.subscription.update({
          where: { id: sub.id },
          data:  { status: "ACTIVE", currentPeriodEnd: newPeriodEnd },
        })
        break
      }

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        const subscriptionId = resource.id as string
        const sub = await db.subscription.findFirst({
          where: { paypalSubscriptionId: subscriptionId },
        })
        if (!sub) break

        await db.subscription.update({
          where: { id: sub.id },
          data:  { status: "CANCELLED" },
        })
        break
      }

      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        const subscriptionId = resource.id as string
        const sub = await db.subscription.findFirst({
          where: { paypalSubscriptionId: subscriptionId },
        })
        if (!sub) break

        await db.subscription.update({
          where: { id: sub.id },
          data:  { status: "PAST_DUE" },
        })
        break
      }
    }
  },
}
