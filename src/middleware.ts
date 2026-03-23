// middleware.ts — raíz del proyecto (reemplaza ambos archivos, borra proxy.ts)

import { auth }        from "@/server/auth"
import { NextResponse, type NextRequest } from "next/server"

// ── Rate limiter in-memory ─────────────────────────────────────────────────
// ⚠️ Solo funciona en un proceso. Para multi-instancia en producción
//    reemplazar con Upstash Redis: https://upstash.com/docs/redis/sdks/ratelimit

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now   = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ── IP helper — funciona en Vercel, Railway, y local ──────────────────────

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    // req.ip existe en Vercel Edge pero no en todos los runtimes
    "unknown"
  )
}

// ── Rutas protegidas por rol ───────────────────────────────────────────────

const COACH_ROUTES     = ["/coach"]
const SUPERADMIN_ROUTES = ["/superadmin"]
const AUTH_ROUTES      = ["/dashboard", "/log", "/weight", "/recipes", "/ingredients", "/plans", "/profile", "/messages"]

// ── Middleware principal ───────────────────────────────────────────────────

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const { pathname }               = nextUrl
  const ip                         = getIp(req)

  // 1. Rate limiting en REST API
  if (pathname.startsWith("/api/v1/")) {
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }
  }

  // 2. Rutas que requieren sesión
  const needsAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  if (needsAuth && !session) {
    const signinUrl = new URL("/auth/signin", nextUrl)
    signinUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signinUrl)
  }

  // 3. Rutas de coach
  const needsCoach = COACH_ROUTES.some((r) => pathname.startsWith(r))
  if (needsCoach && !session) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl))
  }
  if (needsCoach && session?.user.role !== "COACH" && session?.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // 4. Rutas de superadmin
  const needsAdmin = SUPERADMIN_ROUTES.some((r) => pathname.startsWith(r))
  if (needsAdmin && !session) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl))
  }
  if (needsAdmin && session?.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Rutas protegidas
    "/dashboard/:path*",
    "/log/:path*",
    "/weight/:path*",
    "/recipes/:path*",
    "/ingredients/:path*",
    "/plans/:path*",
    "/profile/:path*",
    "/messages/:path*",
    "/coach/:path*",
    "/superadmin/:path*",
    // REST API (rate limiting)
    "/api/v1/:path*",
    // Excluir archivos estáticos y rutas de Next.js
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}