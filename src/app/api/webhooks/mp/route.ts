/* eslint-disable @typescript-eslint/prefer-regexp-exec */
import { type NextRequest, NextResponse } from "next/server"
import { MPSubscriptionService }          from "@/server/services/mp-subscription.service"
import crypto                             from "crypto"

function verifySignature(req: NextRequest, body: string): boolean {
  // En desarrollo aceptar todo
  if (process.env.NODE_ENV !== "production") return true

  const secret    = process.env.MP_WEBHOOK_SECRET ?? ""
  const signature = req.headers.get("x-signature") ?? ""
  const requestId = req.headers.get("x-request-id") ?? ""
  const tsMatch   = signature.match(/ts=(\d+)/)
  const v1Match   = signature.match(/v1=([a-f0-9]+)/)

  if (!tsMatch || !v1Match) return false

  const ts      = tsMatch[1]
  const v1      = v1Match[1]
  const toSign  = `id:${requestId};request-id:${requestId};ts:${ts};`
  const hmac    = crypto.createHmac("sha256", secret).update(toSign).digest("hex")

  return hmac === v1
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  if (!verifySignature(req, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const type   = params.get("type") ?? params.get("topic") ?? ""
  const dataId = params.get("data.id") ?? params.get("id") ?? ""

  if (!type || !dataId) {
    return NextResponse.json({ received: true })
  }

  try {
    await MPSubscriptionService.handleWebhook(type, { id: dataId })
  } catch (err) {
    console.error("[MP Webhook] Error:", err)
  }

  // Siempre 200 para que MP no reintente
  return NextResponse.json({ received: true })
}