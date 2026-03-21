
// // ─────────────────────────────────────────────────────────────────────────────
// // src/middleware.ts
// // Redirige usuarios sin perfil al onboarding
// // Redirige usuarios no autenticados al login
// // ─────────────────────────────────────────────────────────────────────────────
// import { withAuth } from "next-auth/middleware"
// import { NextResponse } from "next/server"

// export default withAuth(
//   function middleware(req) {
//     const { pathname } = req.nextUrl
//     const token = req.nextauth.token

//     // Si no hay sesión → NextAuth lo maneja automáticamente (redirige a /login)
//     if (!token) return NextResponse.next()

//     // Si tiene sesión pero no tiene perfil → redirigir a /setup
//     // (el flag hasProfile viene del JWT callback en auth.ts)
//     const hasProfile = token.hasProfile as boolean | undefined
//     const isSetupPage = pathname.startsWith("/setup")

//     if (!hasProfile && !isSetupPage) {
//       return NextResponse.redirect(new URL("/setup", req.url))
//     }

//     if (hasProfile && isSetupPage) {
//       return NextResponse.redirect(new URL("/dashboard", req.url))
//     }

//     return NextResponse.next()
//   },
//   {
//     callbacks: {
//       authorized: ({ token }) => !!token,
//     },
//   }
// )

// export const config = {
//   matcher: [
//     "/dashboard/:path*",
//     "/log/:path*",
//     "/weight/:path*",
//     "/recipes/:path*",
//     "/ingredients/:path*",
//     "/setup",
//   ],
// }


// // src/middleware.ts
// export { default } from "next-auth/middleware"

// export const config = {
//   matcher: ["/dashboard/:path*", "/log/:path*", "/weight/:path*", "/recipes/:path*"],
// }


// import { NextResponse, type NextRequest } from "next/server"
// import { withAuth } from "next-auth/middleware"

// // Simple in-memory rate limiter (para producción usar Upstash Redis)
// const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

// function rateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
//   const now    = Date.now()
//   const entry  = rateLimitMap.get(ip)

//   if (!entry || now > entry.resetAt) {
//     rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
//     return true
//   }

//   if (entry.count >= limit) return false

//   entry.count++
//   return true
// }

// export default withAuth(
//   function middleware(req: NextRequest) {
//     // Rate limit solo en REST API (/api/v1/*)
//     if (req.nextUrl.pathname.startsWith("/api/v1/")) {
//       const ip      = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
//       const allowed = rateLimit(ip, 60, 60_000) // 60 req/min por IP

//       if (!allowed) {
//         return NextResponse.json(
//           { error: "Too many requests" },
//           {
//             status: 429,
//             headers: { "Retry-After": "60" },
//           }
//         )
//       }
//     }

//     return NextResponse.next()
//   },
//   {
//     callbacks: { authorized: ({ token }) => !!token },
//   }
// )

// export const config = {
//   matcher: [
//     "/dashboard/:path*",
//     "/log/:path*",
//     "/weight/:path*",
//     "/recipes/:path*",
//     "/ingredients/:path*",
//     "/plans/:path*",
//     "/profile/:path*",
//     "/messages/:path*",
//     "/coach/:path*",
//     "/superadmin/:path*",
//     "/api/v1/:path*",
//   ],
// }
import { auth } from "@/server/auth"
import { NextResponse, type NextRequest } from "next/server"

// ⚠️ still not production safe, but ok for now
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

export default auth((req: NextRequest & { auth?: any }) => {
  const { nextUrl } = req
  const { pathname } = nextUrl

  const ip =
    req.ip ??
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    "unknown"

  // 🔒 Rate limit API
  if (pathname.startsWith("/api/v1")) {
    const allowed = rateLimit(ip)

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }
  }

  // 🔐 Protect dashboard
  if (pathname.startsWith("/dashboard") && !req.auth) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/v1/:path*",
  ],
}