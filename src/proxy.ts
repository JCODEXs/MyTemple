
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


// src/middleware.ts
export { default } from "next-auth/middleware"

export const config = {
  matcher: ["/dashboard/:path*", "/log/:path*", "/weight/:path*", "/recipes/:path*"],
}


